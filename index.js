const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w4f5dls.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const newsletterSubscriberCollection = client
      .db("nexTechyDB")
      .collection("newsletterSubscriber");

    //   Post newsletter email in database
    app.post("/api/v1/newsletter-subscriber", async (req, res) => {
      try {
        const subscriber = req.body;
        const result = await newsletterSubscriberCollection.insertOne(
          subscriber
        );
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`nexTechy listening on port ${port}`);
});
