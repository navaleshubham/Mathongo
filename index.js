require('dotenv').config();
const nodemailer = require('nodemailer')
const express = require('express')
const https = require('https');
const schedule = require('node-schedule');
const app = express()
const cors = require('cors')
var fs = require('fs');
var dsv = require('d3-dsv');
const bodyParser = require('body-parser');
const { json } = require('body-parser');
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
let Items;
let Orders
const MongoClient = require('mongodb').MongoClient;
var uri = "mongodb+srv://ssnpvt:r0tPw0PlICucl7@cluster0-veipg.mongodb.net/mathongo?retryWrites=true&w=majority";
MongoClient.connect(uri, { useUnifiedTopology: true }, async function (err, client) {
  if (err) {
    console.log('Error occurred while connecting to MongoDB Atlas...\n', err);
  }
  else {
    console.log('Connected...');
    Items = client.db('mathongo').collection('Items')
    Orders = client.db('mathongo').collection('Orders')
  }
});
var d=new Date()
var t=new Date(d.getTime() + (24 * 60 * 60 * 1000))


function ConvertToCSV(file) {
  let data = dsv.csvFormat(file)
  fs.writeFileSync('data.csv', data, (err, result) => {
    if (err) return err
    return true
  })
}

function sendmail(reciver, obj) {
  const GMAIL_USER = process.env.GMAIL_USER
  const GMAIL_PASS = process.env.GMAIL_PASS
  const smtpTrans = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS
    }
  });


  const mailOpts = {
    from: `shubham.navale17@comp.sce.edu.in`,
    to: `${reciver}`,
    bcc: 'shubham.navale17@comp.sce.edu.in',
    subject: `Todays Data`,
    attachments: [{ filename: 'todaydata.csv', path: 'data.csv', contentType: 'csv' }],
    html: `
    <h1>Todays data</h1>
    <br>
    <h3>Todays Transctions: ${obj.todaytrans[0].count} </h3>
    <h3>Todays Successful Transctions : ${obj.successtrans[0].count}</h3>
    <h3>Todays volume: ${obj.todaysvolume[0].volume}</h3>
    `
  }
  smtpTrans.sendMail(mailOpts, (error, response) => {
    if (error) {
      // res.json({result:false})
      console.log('failed', error)
    }
    else {
      console.log('done')
      // res.json({result:true})
    }
  })

}
function getautocall(){
  let csvfiledata = [];
  let todaytrans = [];
  let successtrans = [];
  let todaysvolume = [];
  let alldata = { '1': false, '2': false, '3': false, '4': false }
  let date = new Date().toISOString().slice(0, 10) + '*'
  let pipe = [
    {
      '$match': {
        'createdAt.Date': {
          '$regex': date
        }
      }
    },
    {
      '$lookup': {
        'from': 'Items',
        'localField': 'item',
        'foreignField': '_id',
        'as': 'items'
      }
    }, {
      '$unwind': {
        'path': '$items'
      }
    }, {
      '$project': {
        'sl_no': {
          '$sum': 1
        },
        'order_id': '$_id',
        'payment_id': '$payment_id',
        'createdAt': '$createdAt.Date',
        'updatedAt': '$updatedAt.Date',
        'item_id': '$item._id',
        'item_name': '$item.title',
        'coupon_amount': '$coupon',
        'paid_status': '$paid',
        'phone': '$phone',
        'email': '$email',
        'utm_params_source': '$utm_params.source',
        'utm_params_medium': '$utm_params.medium',
        'utm_params_campaign': '$utm_params.campaign',
        'utm_params_term': '$utm_params.term'
      }
    }
  ]
  Orders.aggregate(pipe, (e, r) => {
    r.forEach(element => {
      csvfiledata.push(element)
      alldata['1'] = true
    });
  })
  const todays = [
    {
      '$match': {
        'createdAt.Date': {
          '$regex': date
        }
      }
    }, {
      '$count': 'count'
    }
  ];
  Orders.aggregate(todays, (e, r) => {
    r.forEach(element => {
      todaytrans.push(element)
      alldata['2'] = true
    });
  })
  const done = [
    {
      '$match': {
        'createdAt.Date': {
          '$regex': date
        },
        'paid': true
      }
    }
    , {
      '$count': 'count'
    }
  ];
  Orders.aggregate(done, (e, r) => {
    r.forEach(element => {
      successtrans.push(element)
      alldata['3'] = true
    });
  })
  const volume = [
    {
      '$match': {
        'createdAt.Date': {
          '$regex': date
        },
        'paid': true
      }
    }, {
      '$project': {
        'volume': {
          '$sum': '$amount'
        },
        '_id': 0
      }
    }
  ];
  Orders.aggregate(volume, (e, r) => {
    r.forEach(element => {
      todaysvolume.push(element)
      alldata['4'] = true
    });
  })
  let datainter = setInterval(() => {
    if (alldata['1'] && alldata['2'] && alldata['3'] && alldata['4']) {
      let obj = { csvfiledata, todaytrans, successtrans, todaysvolume, 'result': done }
      clearInterval(datainter)
      ConvertToCSV(csvfiledata)
      sendmail('shubham.navale17@comp.sce.edu.in', obj)
    }
  }, 1000)
}
app.get('/:email', (req, res) => {
  let csvfiledata = [];
  let todaytrans = [];
  let successtrans = [];
  let todaysvolume = [];
  let alldata = { '1': false, '2': false, '3': false, '4': false }
  let date = new Date().toISOString().slice(0, 10) + '*'
  let pipe = [
    {
      '$match': {
        'createdAt.Date': {
          '$regex': date
        }
      }
    },
    {
      '$lookup': {
        'from': 'Items',
        'localField': 'item',
        'foreignField': '_id',
        'as': 'items'
      }
    }, {
      '$unwind': {
        'path': '$items'
      }
    }, {
      '$project': {
        'sl_no': {
          '$sum': 1
        },
        'order_id': '$_id',
        'payment_id': '$payment_id',
        'createdAt': '$createdAt.Date',
        'updatedAt': '$updatedAt.Date',
        'item_id': '$item._id',
        'item_name': '$item.title',
        'coupon_amount': '$coupon',
        'paid_status': '$paid',
        'phone': '$phone',
        'email': '$email',
        'utm_params_source': '$utm_params.source',
        'utm_params_medium': '$utm_params.medium',
        'utm_params_campaign': '$utm_params.campaign',
        'utm_params_term': '$utm_params.term'
      }
    }
  ]
  Orders.aggregate(pipe, (e, r) => {
    r.forEach(element => {
      csvfiledata.push(element)
      alldata['1'] = true
    });
  })
  const todays = [
    {
      '$match': {
        'createdAt.Date': {
          '$regex': date
        }
      }
    }, {
      '$count': 'count'
    }
  ];
  Orders.aggregate(todays, (e, r) => {
    r.forEach(element => {
      todaytrans.push(element)
      alldata['2'] = true
    });
  })
  const done = [
    {
      '$match': {
        'createdAt.Date': {
          '$regex': date
        },
        'paid': true
      }
    }
    , {
      '$count': 'count'
    }
  ];
  Orders.aggregate(done, (e, r) => {
    r.forEach(element => {
      successtrans.push(element)
      alldata['3'] = true
    });
  })
  const volume = [
    {
      '$match': {
        'createdAt.Date': {
          '$regex': date
        },
        'paid': true
      }
    }, {
      '$project': {
        'volume': {
          '$sum': '$amount'
        },
        '_id': 0
      }
    }
  ];
  Orders.aggregate(volume, (e, r) => {
    r.forEach(element => {
      todaysvolume.push(element)
      alldata['4'] = true
    });
  })
  let datainter = setInterval(() => {
    if (alldata['1'] && alldata['2'] && alldata['3'] && alldata['4']) {
      let obj = { csvfiledata, todaytrans, successtrans, todaysvolume, 'result': done }
      clearInterval(datainter)
      ConvertToCSV(csvfiledata)
      sendmail(req.params.email, obj)
      res.send(obj)
    }
  }, 1000)
})

const port = process.env.PORT || 3000;
const server = app.listen(port, function () {
  console.log('Listening on port ' + port);
  console.log(server.address())
});  
var j = schedule.scheduleJob(t, function(){
  getautocall()
});
