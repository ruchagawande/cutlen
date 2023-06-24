const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const Str = require("@supercharge/strings");
const userModel = require("./src/models/userModel");
const urlModel = require("./src/models/urlModel");

const paymentRoute = require("./src/route/paymentRoute");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("./app/views"));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://127.0.0.1:5500");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use("/api", paymentRoute);

require("./src/db/connect");

app.post("/api/Register", async (req, res) => {
  try {
    if (!req.body.name) {
      return res.send("Name is missing.");
    }
    if (!req.body.email) {
      return res.send("Email is missing.");
    }

    const EmailRegexp =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const userEmail = EmailRegexp.test(req.body.email);

    if (!userEmail) {
      return res.send("Please Enter A Correct Email like abc@example.com");
    }

    if (!req.body.password) {
      return res.send("Password is missing.");
    }

    const inputPass = req.body.password;
    const passwordCheck = /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[\W_]).{3,}$/;
    const userPassword = passwordCheck.test(inputPass);

    if (!userPassword) {
      return res.send("Password is weak. Please enter a strong password");
    }

    const user = await userModel.findOne({ email: req.body.email });
    if (user) {
      return res.send("The Email address has already been taken.");
    }

    bcrypt.hash(req.body.password, 10, function (err, hash) {
      if (err) {
        return res.send("Error in password encryption.");
      }

      userModel
        .create({
          name: req.body.name,
          email: req.body.email,
          password: hash,
          status: true,
        })
        .then((newuserdata) => {
          res.json({
            message: "Register successfully",
          });
        })
        .catch((error) => {
          res.send("Error creating user.");
        });
    });
  } catch (error) {
    res.send("Error in registration.");
  }
});

app.post("/api/login", async (req, res) => {
  try {
    if (!req.body.email) {
      return res.send("email is missing.");
    }

    if (!req.body.password) {
      return res.send("Password is missing.");
    }

    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      return res.send("Invalid user.");
    }

    const decode = bcrypt.compareSync(req.body.password, user.password);
    if (decode) {
      return res.json({
        message: "Login successfully.",
        data: {
          userId: user._id,
          email: user.email,
        },
      });
    } else {
      return res.send("Invalid password.");
    }
  } catch (error) {
    res.send("Error in login.");
  }
});

// app.post("/api/URLShortner", async (req, res) => {
//   try {
//     if (!req.body.mainurl) {
//       return res.send("mainURL is missing.");
//     }

//     const random = Str.random(6);

//     urlModel
//       .create({
//         url: req.body.mainurl,
//         shortURL: random,
//       })
//       .then(async (newrequest) => {
//         console.log(newrequest);
//         const data = newrequest;
//         console.log(data);
//         const userId = req.user.id;
//         const user = await user.findById(userId);
//         user.shortLinkHistory.push(newrequest);
//         await user.save();

//         res.json({
//           data: data,
//         });
//       })
//       .catch((error) => {
//         res.send("Error creating URL.");
//       });
//   } catch (error) {
//     res.send("Error in URL shortening.");
//   }
// });

app.post("/api/URLShortner", async (req, res) => {
  try {
    if (!req.body.mainurl) {
      return res.send("mainURL is missing.");
    }

    const random = Str.random(6);

    urlModel
      .create({
        url: req.body.mainurl,
        shortURL: random,
      })
      .then(async (newrequest) => {
        console.log(newrequest);
        const data = newrequest;
        console.log(data);
        const userId = req.user.id; // Assuming you have the user ID available in the request object

        // await user.findByIdAndUpdate(userId,{$inc:{shortLinkCount:1}});
        const user = await userModel.findById(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        user.shortLinkHistory.push(newrequest);
        user.shortLinkCount += 1;
        await user.save();

        res.json({
          data: data,
        });
      })
      .catch((error) => {
        res.send("Error creating URL.");
      });
  } catch (error) {
    res.send("Error in URL shortening.");
  }
});

app.post("/api/saveShortLink/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { shortLink } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.shortLinkHistory.push(shortLink);
    await user.save();

    res.json({ message: "Short link saved to user's profile." });
  } catch (error) {
    res.status(500).json({ message: "Error saving short link." });
  }
});
app.get("/api/countShortLinks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const count = user.shortLinkCount;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error counting short links." });
  }
});
app.get("/api/:shortURL", async (req, res) => {
  try {
    if (!req.params.shortURL) {
      return res.send("Short URL is missing");
    }

    const shorturl = await urlModel.findOne({
      shortURL: req.params.shortURL,
    });

    if (shorturl == null) {
      return res.sendStatus(404);
    }

    const mainurl = shorturl.url;
    console.log(mainurl);
    res.redirect(mainurl);
  } catch (error) {
    res.send("Error retrieving URL.");
  }
});

app.get("/api/myProfile/:email", async (req, res) => {
  try {
    if (!req.params.email) {
      return res.send("Email is missing.");
    }

    const userdata = await userModel.findOne({ email: req.params.email });

    res.json({
      message: "User Profile data",
      data: userdata,
    });
  } catch (error) {
    res.send("Error retrieving user profile.");
  }
});

app.get("/api/logout/:email", async (req, res) => {
  try {
    if (!req.params.email) {
      return res.send("Email is missing.");
    }

    userModel
      .updateOne({ email: req.params.email }, { $set: { status: false } })
      .then(() => {
        res.json({
          message: "User logout successfully.",
        });
      })
      .catch((error) => {
        res.send("Error logging out.");
      });
  } catch (error) {
    res.send("Error logging out.");
  }
});

const port = process.env.port || 8090;
app.listen(port, () => {
  console.log("Server is running on port 8090 ");
});