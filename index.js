const express = require('express')
const app = express()
const cors = require('cors')
const port = 5000
require('dotenv').config()

app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const logger = (req, res, next) => {
  // console.log('logger middleware logged', req.params);
  next();
}



const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    await client.connect();

    const database = client.db("hireloop-db");
    const jobCollection = database.collection("jobs");
    const companyCollection = database.collection("companies");
    const usersCollection = database.collection("user");
    const applicationsCollection = database.collection("applications");
    const planCollection = database.collection('plan');
    const subscriptionCollection = database.collection('subscriptions');
    const sessionCollection = database.collection('session');

    // verification related
    const verifyToken = async (req, res, next) => {

      const authHeader = req.headers?.authorization;
      
      if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
      }

      const token = authHeader.split(' ')[1]

      if (!token) {
        return res.status(401).send({
          message: 'unauthorized access'
        })
      }

      const query = { token: token }
      const session = await sessionCollection.findOne(query);

     if (!session) {
        return res.status(401).send({
          message: 'unauthorized access'
        })}

      const userId = session?.userId;

      const userQuery = {
        _id: userId
      }

      const user = await usersCollection.findOne(userQuery);
      if (!user) {
        return res.status(401).send({
          message: 'unauthorized access'
        })}

      req.user = user;
      next();
    }

    const verifySeeker = async (req, res, next) => {
      if (req.user?.role !== 'seeker') {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

    const verifyRecruiter = async (req, res, next) => {
      if (req.user?.role !== 'recruiter') {
        return res.status(403).send({ message: 'forbidden access' })
      }

      next()
    }

    const verifyAdmin = async (req, res, next) => {
      if (req.user.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }


// jobs related APIS
    app.get('/api/jobs', async (req, res) => {
      const query = {};
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
        // console.log(req.query.companyId);
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/api/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    })

    app.post('/api/jobs', async (req, res) => {
      const job = req.body;
      const newJob = {
        ...job,
        createdAt: new Date()
      }
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    // application related API
    app.get('/api/applications', verifyToken, verifySeeker, async (req, res) => {
      const query = {};
      if (req.query.applicantId) {
        query.applicantId = req.query.applicantId;

        // check whether asking for user information or someone else

        if (req.user._id.toString() !== req.query.applicantId) {
          return res.status(403).send({ message: 'forbidden access' })
        }
      }
      if (req.query.jobId) {
        query.jobId = req.query.jobId;
      }
      const cursor = applicationsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })


    app.post('/api/applications', async (req, res) => {
      const application = req.body;
      const newApplication = {
        ...application,
        createdAt: new Date()
      };
      const result = await applicationsCollection.insertOne(newApplication);
      res.send(result);
    });

    // app.get('/api/companies', async (req, res) => {
    //   const cursor = companyCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // })

    app.get('/api/companies', verifyToken, async (req, res) => {
      const cursor = companyCollection.find().skip(15);
      const companies = await cursor.toArray();
      for (const company of companies) {
        const filter = {
          companyId: company._id.toString()
        }
        // console.log(filter);
        const jobCount = await jobCollection.countDocuments(filter)
        company.jobCount = jobCount
        // console.log(jobCount);
      }

      res.send(companies);
    });

    app.get('/api/companies2', async (req, res) => {
      const pipeline = [
        {
          $skip: 15
        }
      ];
      const cursor = companyCollection.aggregate(pipeline);
      const result = await cursor.toArray()
      res.send(result)
    })



    app.get('/api/my/companies', async (req, res) => {
      const query = {};
      if (req.query.recruiterId) {
        query.recruiterId = req.query.recruiterId;
      }
      const result = await companyCollection.findOne(query);
      res.send(result ?? {});
    })

    // company related api

    app.post('/api/companies', async (req, res) => {
      const company = req.body;
      const newCompany = {
        ...company,
        createdAt: new Date()
      }
      const result = await companyCollection.insertOne(newCompany);
      res.send(result);
    });

    app.patch('/api/companies/:id', logger, verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedCompany = req.body;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: updatedCompany.status
        }
      }
      const result = await companyCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    // plan
    app.get('/api/plan', async (req, res) => {
      const query = {}
      if (req.query.plan_id) {
        query.id = req.query.plan_id
      }
      const plan = await planCollection.findOne(query);
      res.send(plan)
    });

    //  subscription
    app.post('/api/subscriptions', async (req, res) => {
      const data = req.body;
      const subsInfo = {
        ...data,
        createdAt: new Date()
      }
      const result = await subscriptionCollection.insertOne(subsInfo);

      const filter = { email: data.email };
      const updatedDocument = {
        $set: {
          plan: data.planId,
        }
      }
      const updateResult = await usersCollection.updateOne(filter, updatedDocument);
      res.send(updateResult);
    });




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})