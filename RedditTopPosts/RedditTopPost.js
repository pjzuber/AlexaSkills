/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.e82a06c1-8cbc-4b61-88fd-6b3e8db4217b") {
             context.fail("Invalid Application ID");
        }
        

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("WhatsTheTopPostIntent" === intentName) {
        console.log("found the intent");
        getTopPost(intent, session, callback);
    } else if("AffirmativeResponseIntent"){
        affirmativeResponse(intent, session, callback)   
    }  else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName || "AMAZON.NoIntent" === intentName){
        stopIntent(intent, session, stopCallback);
    }
      else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome to Reddit Top Posts";
    var speechOutput = "Welcome to Reddit Top Posts. " +
        "Please tell me the sub reddit you would like to hear by saying, What is the top post in World News";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Please tell me the subreddit you would like to hear by saying, What is the top post in World News";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function stopIntent (intent, session, response) {
        // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome to Reddit Top Posts";
    var speechOutput = "Goodbye";
    var repromptText = "";
    var shouldEndSession = true;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }

/**
 * Get top post of sub from slots.sub
 */
function getTopPost(intent, session, callback) {
    var cardTitle = "intent.name;"
    var subRedditSlot = intent.slots.sub;
    var repromptText = "";
    var sessionAttributes = {}
    var topPost;
    var shouldEndSession = false;
    var speechOutput = "";
    var subReddit;
    
    if (subRedditSlot) {
        console.log("subredditslot value: " + subRedditSlot.value);
        subReddit = subRedditSlot.value;
        cardTitle = "Top Reddit Post for: " + subReddit;
        getTopPostFromReddit(subReddit, function(response)
        {
        console.log(response);
        speechOutput = "The top post in " + subReddit + " is titled: " + response.title;
        repromptText = "";
        if(response.isSelf){
            speechOutput = speechOutput + ". This is a self-post. Would you like me to read the content?"
            repromptText = "Would you like me to read the post's content?";
            sessionAttributes.getContent = true;
            sessionAttributes.title = response.title;
            sessionAttributes.url = response.url;
        }
        else{
            shouldEndSession = true;
        }
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession, response.url));
        });
        
    } else {
        speechOutput = "I could not find the subreddit " + subReddit + ". Please try again";
        repromptText = "Please tell me the subreddit you would like to hear. For example, What is the top post in World News";
        callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }

    
}

function getTopPostFromReddit(subReddit, eventCallback) {
    var retVal = {};
    sub = subReddit.replace(/\s+/g, '');
    var url = "https://www.reddit.com/r/" + sub + ".json?limit=1";
    var https = require('https');
    console.log('start request to ' + url);
    
    https.get(url, function(response) {
    var json = '';
    response.on('data', function(chunk) {
      json += chunk;
    });
    response.on('end', function() {
      var redditResponse = JSON.parse(json);
      redditResponse.data.children.forEach(function(child) {
	if(child.data.domain !== 'self.node') {
	  console.log('-------------------------------');
	  retVal.title = child.data.title;
	  retVal.isSelf = child.data.is_self;
	  retVal.url = child.data.url;
	}
      });
      eventCallback(retVal);
    });
  }).on('error', function(err) {
    console.log(err);
  });
  
    
    console.log('end request to ' + url);
}

function affirmativeResponse(intent, session, callback){
    console.log("affirmativeResponse");
    var cardTitle = "intent.name;"
    var repromptText = "";
    var sessionAttributes = session.attributes;
    var topPost;
    var shouldEndSession = false;
    var speechOutput = "";
    var content;
    if(session.attributes.getContent)
    {
        shouldEndSession = true; //for now
        cardTitle = session.attributes.title;
        getPostContent(session.attributes.url, function(response){
            speechOutput = response.content;
            callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        })
    }
    else
    {
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function getPostContent(path, eventCallback){
    var retVal = {};
    
    var url = path + ".json";
    var https = require('https');
    console.log('start request to ' + url);
    
    https.get(url, function(response) {
        console.log("in response");
    var json = '';
    response.on('data', function(chunk) {
      json += chunk;
    });
    response.on('end', function() {
      var redditResponse = JSON.parse(json);
      redditResponse[0].data.children.forEach(function(child) {
	if(child.data.domain !== 'self.node') {
	  console.log('-------------------------------');
	  retVal.content = child.data.selftext;
	  retVal.url = child.data.url;
	  eventCallback(retVal);
	}
      });
    });
  }).on('error', function(err) {
    console.log(err);
  });
    console.log('end request to ' + url);
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession, additionalCardContent) {
    var cardContent = output;
    var isPic = false;
    if(additionalCardContent)
    {
        console.log("content search result: " + additionalCardContent.search(".jpg"))
        cardContent += "\n" + additionalCardContent;
        if(additionalCardContent.search(".jpg") != -1 || additionalCardContent.search(".png") != -1)
        {
            isPic = true;
            if (additionalCardContent.indexOf('http:') > -1) 
            {
                additionalCardContent = additionalCardContent.replace('http:', 'https:');
            }
        }
    }
    if(isPic)
    {
        return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Standard",
            title: title,
            text: cardContent,
            image: {
                smallImageUrl: additionalCardContent,
                largeImageUrl: additionalCardContent
            }
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
    }
    else
    {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: cardContent
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
