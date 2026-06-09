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

    app.get('/api/users', async (req, res) => {
      const cursor = usersCollection.find().skip(1);
      const result = await cursor.toArray();
      res.send(result);
    })



    app.get('/api/jobs', async (req, res) => {
      const query = {};
      if(req.query.companyId){
        query.companyId = req.query.companyId;
      console.log(req.query.companyId);
      }
      if(req.query.status){
        query.status = req.query.status;
      }
      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send(result );
  })

  app.get('/api/jobs/:id', async (req, res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
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
      res.send(result );
  });

  app.get('/api/companies', async (req, res) => {
    const cursor = companyCollection.find().skip(15);
    const result = await cursor.toArray();
    res.send(result);
  })

  app.get('/api/my/companies', async (req, res) => {
    const query = {};
    if(req.query.recruiterId){
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