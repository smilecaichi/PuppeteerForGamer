const puppeteer = require('puppeteer');

const fs = require('fs');
const axios = require('axios')
const FormData = require('form-data'); // npm install --save form-data

require('dotenv').config();

const webhook_url = process.env.webhook_url;
const oauthToken = process.env.oauthToken;

const USER_ID = process.env.USER_ID;
const USER_PW = process.env.USER_PW;

(async () => {
  let date_time = new Date();

  // get current date
  // adjust 0 before single digit date
  let date = ('0' + date_time.getDate()).slice(-2);

  // get current month
  let month = ('0' + (date_time.getMonth() + 1)).slice(-2);

  // get current year
  let year = date_time.getFullYear();

  // get current hours
  let hours = ('0' + date_time.getHours()).slice(-2);

  // get current minutes
  let minutes = ('0' + date_time.getMinutes()).slice(-2);

  // get current seconds
  let seconds = ('0' + date_time.getSeconds()).slice(-2);

  // prints date & time in YYYY-MM-DD HH:MM:SS format
  let dt = year + '_' + month + '_' + date + '_' + hours + '_' + minutes + '_' + seconds;

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null
  });

  //const page = await browser.newPage();
  const [page] = await browser.pages();

  await page.goto('https://user.gamer.com.tw/login.php');
  try {
    await loadCookie(page); //load cookie

    await page.goto('https://www.gamer.com.tw/')
  } catch (e) {
    console.log(e)

    await page.type('input[name=userid]', USER_ID);
    await new Promise(r => setTimeout(r, 1000));

    await page.type('input[name=password]', USER_PW);
    await new Promise(r => setTimeout(r, 1000));

    //我不是機器人
    await page.waitForSelector("iframe")
    const elementHandle = await page.$("iframe")
    const iframe = await elementHandle.contentFrame()
    //now iframe is like "page", and to click in the button you can do this
    await iframe.click("#recaptcha-anchor > div.recaptcha-checkbox-border")
    //or
    /*
    await iframe.evaluate(() => {
        document.querySelector("#recaptcha-anchor > div.recaptcha-checkbox-border").click()
    })
    */

    await new Promise(r => setTimeout(r, 1000));
    await page.click('xpath///*[@id="btn-login"]');

    //await page.screenshot({ path: 'captcha.png' });

    await page.waitForNavigation();
    await saveCookie(page); //save cookie
  }



  //每日簽到
  await page.click('xpath//html/body/div[3]/div/div[1]/div[1]');
  await new Promise(r => setTimeout(r, 3000));

  let [el] = await page.$x('//*[@id="dialogify_1"]/div/div/div/div[1]/p[1]')
  const text = await page.evaluate(name => name.innerText, el)

  //領取雙倍巴幣
  await page.click('xpath//html/body/dialog/div/div/div/div[2]/button');
  await new Promise(r => setTimeout(r, 10000));

  //是否觀看廣告？
  try {
    console.log('是否觀看廣告？')
    await page.click('xpath//html/body/dialog[2]/form/div/div/div[2]/button[2]')
    await new Promise(r => setTimeout(r, 5000));

    console.log('影片將有聲播放。')
    await page.click('xpath//html/body/div/div[4]/div[5]/div/div[3]/div[2]')
    await new Promise(r => setTimeout(r, 3000));

    await new Promise(r => setTimeout(r, 60000));
  } catch (e) {
    console.log(e)
  }

  const fileName = 'gamer_' + dt + '.png';
  const filePath = 'pic/' + fileName;
  await page.screenshot({ path: filePath });

  const form = new FormData();
  form.append('message', '\n巴哈姆特_' + dt + '\n' + text);
  form.append('imageFile', fs.createReadStream(filePath));

  axios.post(webhook_url, form, {
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      'Authorization': 'Bearer ' + oauthToken
    }
  }).then(res => {
    console.log(`statusCode: ${res.status}`)
    //console.log(res)
  }).catch(error => {
    console.error(error)
  });

  await browser.close();
})();

//save cookie function
const saveCookie = async (page) => {
  const cookies = await page.cookies();
  const cookieJson = JSON.stringify(cookies, null, 2);
  await fs.writeFileSync('cookies.json', cookieJson);
}

//load cookie function
const loadCookie = async (page) => {
  const cookieJson = await fs.readFileSync('cookies.json');
  const cookies = JSON.parse(cookieJson);
  await page.setCookie(...cookies);
}