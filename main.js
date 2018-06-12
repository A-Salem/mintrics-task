
const yargs = require('yargs');
const request = require('request');
const _ = require('underscore');
const fs = require('fs');
const measure = require('measure');
const collectTime1 = measure.measure('timer1');
const collectTime2 = measure.measure('timer2');
const collectTime3 = measure.measure('timer3');
const collectTime4 = measure.measure('timer4');

const argv = yargs
  .command('get', 'Get Videos Details', {
    url: {
      describe: 'URL of facebook page',
      demand: true,
      alias: 'u'
    },
    token: {
      describe: 'Access Token',
      demand: true,
      alias: 't'
    }
  })
  .help()
  .argv;

let url = argv.url;
let token = argv.token;

if(url.indexOf('facebook.com/') < 0)
  return console.error('Ensure that you typed a valid facebook page url');

let page = url.split('facebook.com/')[1].trim();

function getVideos() {
  //Getting Videos
  console.log('Getting Videos');
  let getVideosOpts = {
    method: 'GET',
    url: `https://graph.facebook.com/v3.0/${page}/videos?fields=title%2Cdescription&limit=200&access_token=${token}`
  };

  let videos = new Promise ((resolve, reject) => {
    request(getVideosOpts, function(error, response, body){
      if(!error && response.statusCode == 200){
        resolve(body);
      }
    })
  })
  return videos;
}

function getVideoLikeReactComment(vid, type) {
  //Getting Video Likes, Reactions or Comments
  console.log(`Getting Video ${type}`);
  let getVideoLikeReactCommentOpts = {
    method: 'GET',
    url: `https://graph.facebook.com/v3.0/${vid}/${type}?summary=1&access_token=${token}`
  };

  let likes = new Promise ((resolve, reject) => {
    request(getVideoLikeReactCommentOpts, function(error, response, body){
      if(!error && response.statusCode == 200){
        resolve({id: vid, value: body});
      }
    })
  })
  return likes;
}

function getPageIdName() {
  //Getting Page Id and Name
  console.log(`Getting Page Id and Name`);
  let getPageIdNameOpts = {
    method: 'GET',
    url: `https://graph.facebook.com/v3.0/${page}?access_token=${token}`
  };

  let info = new Promise ((resolve, reject) => {
    request(getPageIdNameOpts, function(error, response, body){
      if(body && JSON.parse(body) && JSON.parse(body).error)
        console.error('Invalid Token Or Other Error');
      if(!error && response.statusCode == 200){
        resolve(body);
      }
    })
  })
  return info;
}

function getVideoShares(vid, pid) {
  //Getting Video Shares
  console.log(`Getting Video Shares`);
  let getVideoSharesOpts = {
    method: 'GET',
    url: `https://graph.facebook.com/v3.0/${pid}_${vid}?fields=shares&access_token=${token}`
  };

  let shares = new Promise ((resolve, reject) => {
    request(getVideoSharesOpts, function(error, response, body){
      if(!error && response.statusCode == 200){
        resolve({id: vid, value: body});
      }
    })
  })
  return shares;
}

getPageIdName().then((pageInfo) => {
  pageInfo = JSON.parse(pageInfo);
  getVideos().then((videos) => {
    let data = JSON.parse(videos).data;
    let dataObj = {};
    let likeProms = [];
    _.each(data, (video) => {
      dataObj[video.id] = video;

      getVideoLikeReactComment(video.id, 'likes').then((res) => {
        console.log('Getting Data..');

        //Setting pageId to video
        dataObj[res.id].pageId = pageInfo.id;
        //Setting pageName to video
        dataObj[res.id].pageName = pageInfo.name;

        let value = JSON.parse(res.value);
        dataObj[res.id].likes = value.summary.total_count;
        //save
        saveToFile(dataObj);
        collectTime1();
        console.log(measure.stats('timer1'));
      });

      getVideoLikeReactComment(video.id, 'reactions').then((res) => {
        console.log('Getting Data..');

        let value = JSON.parse(res.value);
        dataObj[res.id].reactions = value.summary.total_count;
        //save
        saveToFile(dataObj);
        collectTime2();
        console.log(measure.stats('timer2'));
      });

      getVideoLikeReactComment(video.id, 'comments').then((res) => {
        console.log('Getting Data..');

        let value = JSON.parse(res.value);
        dataObj[res.id].comments = value.summary.total_count;
        //save
        saveToFile(dataObj);
        collectTime3();
        console.log(measure.stats('timer3'));
      });

      getVideoShares(video.id, pageInfo.id).then((res) => {
        console.log('Getting Data..');

        let value = JSON.parse(res.value);
        dataObj[res.id].shares = value.shares && value.shares.count;
        //save
        saveToFile(dataObj);
        collectTime4();
        console.log(measure.stats('timer4'));
      });

    });

  });
});


function saveToFile(dataObj){
  return fs.writeFile('data.json', JSON.stringify(dataObj, null, 4), (err) => {
    if(err)
      console.error('error while saving data');
  });
}
