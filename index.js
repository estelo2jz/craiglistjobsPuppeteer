const puppeteer = require('puppeteer');
const cheerio  = require('cheerio');
const mongoose = require('mongoose');
const Listings = require("./model/Listings");

async function connecttoMongoDb() {
  await mongoose.connect(`mongodb+srv://test:test@craiglistjobs.zcpkv.mongodb.net/<craiglistListings>?retryWrites=true&w=majority`, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('connected to mongodb');
}

async function scrapeListings(page) {
  await page.goto("https://sfbay.craigslist.org/d/software-qa-dba-etc/search/sof");

  const html = await page.content();
  const $ = cheerio.load(html);
  const listings = $(".result-info").map((index, element) => {
    const titleElement = $(element).find(".result-title");
    const timeElement = $(element).find(".result-date")
    const hoodElement = $(element).find(".result-hood");
    const title = $(titleElement).text();
    const url = $(titleElement).attr('href');
    const datePosted = new Date($(timeElement).attr('datetime'));
    const neighborhood = $(hoodElement)
      .text()
      .trim()
      .replace("(", "")
      .replace(")", "");

    return {
      title,
      url,
      datePosted,
      neighborhood
    }
  }).get();
  return listings;
}

async function scrapeJobDescriptions(listings, page) {
  for (var i = 0; i < listings.length; i++) {
    await page.goto(listings[i].url);
    const html = await page.content();
    const $ = cheerio.load(html);
    const jobDescription = $("#postingbody").text(); 
    const compensation = $(".attrgroup > span:nth-child(1) > b").text();
    listings[i].jobDescription = jobDescription;
    listings[i].compensation = compensation;
    console.log(listings[i].jobDescription);
    console.log(listings[i].compensation);
    const listingsModel = new Listings(listings[i]);
    await listingsModel.save();
    await sleep(1000); // 1 second sleep
  }
}

async function sleep(miliseconds) {
  return new Promise(resolve => setTimeout(resolve, miliseconds));
}

async function main() {
  await connecttoMongoDb();
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage();
  const listings = await scrapeListings(page);
  const listingsWithjobDescription = await scrapeJobDescriptions(listings, page);
  console.log(listings);

}

main();