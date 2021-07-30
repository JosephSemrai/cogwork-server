const express = require("express");
const app = express();

const vision = require("@google-cloud/vision");

const fetch = require("node-fetch");
const cors = require("cors");

// Creates a client
const projectId = "universal-chain-320907";
const keyFilename = "./service-account-file.json";
const client = new vision.ImageAnnotatorClient({ projectId, keyFilename });

var corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors())
// const OpenAI = require("openai-api");
// const openai = new OpenAI("sk-xoSMnBeuvtZcEAG5HDABjyqcMJKu2mbe5MOrUrUy");

app.get("/process", async (req, res) => {
  // params is an object we'll pass to our handlebars template
  try {
    const { question, imageURL } = req.query;

    const [webDetectionResult] = await client.webDetection(imageURL);
    const webDetection = webDetectionResult.webDetection;

    let bestGuessContext = "";

    if (webDetection.bestGuessLabels.length) {
      console.log(
        `Best guess labels found: ${webDetection.bestGuessLabels.length}`
      );
      webDetection.bestGuessLabels.forEach((label) => {
        console.log(`  Label: ${label.label}`);
        bestGuessContext += label.label + " ";
      });
    }

    const [labelDetectionResult] = await client.labelDetection(imageURL);

    const labelAnnotations = labelDetectionResult.labelAnnotations;
    console.log("Labels:");
    const labelAnnotationDescriptions = labelAnnotations.map(
      (label) => label.description
    );

    const contextString = bestGuessContext;
    // + "... Image Labels: " + labelAnnotationDescriptions;

    console.log("Context String: ", contextString);

    const gptProvidedContext = "Image: " + contextString + "\n";

    console.log(gptProvidedContext + question);

    const response = await fetch(
      "https://api.openai.com/v1/engines/davinci-instruct-beta/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.GPT_KEY
        },
        body: JSON.stringify({
          prompt: gptProvidedContext + question,
          max_tokens: 300
        })
      }
    );
    const gptResponseData = await response.json();

    res.json({
      labelAnnotationDescriptions,
      bestGuessContext,
      gptResponseData
    });
  } catch (e) {
    res.json({ error: JSON.stringify(e), params: req.query });
  }
});

//create a server object:
app.get("/", function (req, res) {
  res.write("Hello World!..."); //write a response to the client
  res.end(); //end the response
});

app.get("/", function (req, res) {
  res.write("Hello World!..."); //write a response to the client
  res.end(); //end the response
});

app.listen(process.env.PORT || 8080, function () {
  console.log("server running on 8080");
}); //the server object listens on port 8080
