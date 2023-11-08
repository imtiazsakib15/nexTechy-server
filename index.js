const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const blogsCollection = client.db("nexTechyDB").collection("blogs");
    const wishlistCollection = client.db("nexTechyDB").collection("wishlist");

    //   Get blogs from database
    app.get("/api/v1/blogs", async (req, res) => {
      try {
        const result = await blogsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Get recent blogs from database
    app.get("/api/v1/recent-blogs", async (req, res) => {
      try {
        const options = {
          sort: { time: -1 },
          projection: {
            title: 1,
            image: 1,
            category: 1,
            time: 1,
            short_desc: 1,
          },
        };
        const result = await blogsCollection
          .find({}, options)
          .limit(6)
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Get featured blogs from database
    app.get("/api/v1/featured-blogs", async (req, res) => {
      try {
        const options = {
          sort: { long_desc: 1 },
          projection: {
            title: 1,
            author: 1,
          },
        };
        const result = await blogsCollection
          .find({}, options)
          .limit(10)
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Get single blog from database
    app.get("/api/v1/blogs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await blogsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Get user wishlist from database
    app.get("/api/v1/blogs/wishlist/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = (await wishlistCollection.findOne(query)) || {};
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Get wishlist blogs from database
    app.post("/api/v1/blogs/my-wishlist", async (req, res) => {
      try {
        const ids = req.body;
        const objectIds = ids?.map((id) => new ObjectId(id));
        const result = await blogsCollection
          .find({ _id: { $in: objectIds } })
          .toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Post new blog in database
    app.post("/api/v1/blogs/new", async (req, res) => {
      try {
        const newBlog = req.body;
        const result = await blogsCollection.insertOne(newBlog);
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

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

    //   Patch single blog into database
    app.patch("/api/v1/blogs/update/:id/edit", async (req, res) => {
      try {
        const id = req.params.id;
        const blog = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateBlog = {
          $set: {
            title: blog.title,
            image: blog.image,
            category: blog.category,
            short_desc: blog.short_desc,
            long_desc: blog.long_desc,
            time: blog.time,
          },
        };
        const result = await blogsCollection.updateOne(filter, updateBlog);
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Put blogs id in wishlist in database
    app.put("/api/v1/blogs/wishlist/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const newWishlist = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateWishlist = {
          $set: {
            email: newWishlist.email,
            wishlist: newWishlist.wishlist,
          },
        };
        const result = await wishlistCollection.updateOne(
          filter,
          updateWishlist,
          options
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
