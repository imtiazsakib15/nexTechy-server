const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://nextechy-97707.web.app",
      "https://nextechy.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

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
  // middleware
  const verifyToken = (req, res, next) => {
    try {
      const token = req?.cookies?.token;
      if (!token) return res.status(401).send({ message: "Unauthorized" });

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: "Unauthorized" });
        req.user = decoded;
        next();
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({ success: false, error: "Internal Server Error" });
    }
  };

  try {
    // await client.connect();

    const newsletterSubscriberCollection = client
      .db("nexTechyDB")
      .collection("newsletterSubscriber");
    const blogsCollection = client.db("nexTechyDB").collection("blogs");
    const wishlistCollection = client.db("nexTechyDB").collection("wishlist");
    const commentsCollection = client.db("nexTechyDB").collection("comments");

    // Issue a token and send to cookie when login or register
    app.post("/api/v1/jwt", async (req, res) => {
      try {
        const loggedUser = req.body;
        console.log(loggedUser);
        const token = jwt.sign(loggedUser, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1h",
        });

        res
          .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    // Clear token from cookie when logout
    app.post("/api/v1/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (error) {
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Get blogs from database
    app.get("/api/v1/blogs", async (req, res) => {
      try {
        const searchedCategory = req.query.category;
        const searchedTitle = req.query.title;

        let query = {};
        if (searchedCategory == "" && searchedTitle == "") {
          query = {};
        } else if (searchedTitle == "") {
          query = { category: searchedCategory };
        } else if (searchedCategory == "") {
          query = { title: { $regex: searchedTitle, $options: "i" } };
        } else
          query = {
            category: searchedCategory,
            title: { $regex: searchedTitle, $options: "i" },
          };

        const result = await blogsCollection.find(query).toArray();
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
    app.get("/api/v1/blogs/wishlist/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };

        if (email !== req.user?.email)
          return res.status(403).send({ message: "Forbidden" });

        const result = (await wishlistCollection.findOne(query)) || {};
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Get all comments for a blog from database
    app.get("/api/v1/blogs/:id/comments", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { blogId: { $in: [id] } };
        const options = {
          sort: { _id: -1 },
        };
        const result = await commentsCollection.find(query, options).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    //   Post wishlist blogs from database
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

    //   Post new comment for any blog in database
    app.post("/api/v1/blogs/comments", async (req, res) => {
      try {
        const comment = req.body;
        const result = await commentsCollection.insertOne(comment);
        res.send(result);
      } catch (error) {
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
    // await client.db("admin").command({ ping: 1 });
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
