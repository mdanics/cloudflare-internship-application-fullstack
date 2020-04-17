const COOKIE_NAME = "variant";

class TitleHandler {
  element(element) {
    element.prepend("Welcome to: ");
  }
}

class ContentTitleHandler {
  element(element) {
    element.append(" looks better than ever :)");
  }
}

class DescriptionHandler {
  element(element) {
    element.setInnerContent(
      "Hi! My name is Matthew Danics, and I would love to have the oppourtunity to intern at Cloudflare this summer!"
    );
    element.after("(p.s. this variant will be persistent for 1 week)");
  }
}

class CallToActionHandler {
  element(element) {
    element.setInnerContent("Check out my website!");
    element.setAttribute("href", "https://matt.danics.ca");
  }
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Respond randomly between variants of a webpage, with customizations using HTMLRewriter
 * @param {Request} request
 */
async function handleRequest(request) {
  const headers = { "content-type": "text/html" };
  let responseBody;

  try {
    const response = await fetch(
      "https://cfw-takehome.developers.workers.dev/api/variants"
    );
    const variants = (await response.json()).variants;
    let variantToServe;

    const variantIndexCookie = parseInt(getCookie(request, COOKIE_NAME)); // cookie is the variant index
    if (isNaN(variantIndexCookie) || variantIndexCookie > variants.length - 1) {
      // there has been no cookie set, or the cookie is invalid, so we must randomly serve a variant
      // randomly chose a varient from the list of varients (dynamic based on varient size, to allow for more than 2 varients)
      const randomVariantIndex = Math.floor(Math.random() * variants.length);
      variantToServe = variants[randomVariantIndex];

      // create the set-cookie header to save this index in cookies
      const expiry = new Date();
      // expire in 1 week
      expiry.setDate(expiry.getDate() + 7);
      headers[
        "set-cookie"
      ] = `${COOKIE_NAME}=${randomVariantIndex};expires=${expiry.toUTCString()}`;
    } else {
      // a cookie was set, so we must serve the variant index that is set in the cookies
      variantToServe = variants[variantIndexCookie];
    }

    const variantRes = await fetch(variantToServe);

    responseBody = new HTMLRewriter()
      .on("title", new TitleHandler())
      .on("h1#title", new ContentTitleHandler())
      .on("p#description", new DescriptionHandler())
      .on("a#url", new CallToActionHandler())
      .transform(variantRes).body;
  } catch (err) {
    console.error(err);
    responseBody = "An Error has occured!";
  }
  return new Response(responseBody, { headers });
}

/**
 * from: https://developers.cloudflare.com/workers/templates/pages/cookie_extract/
 * Grabs the cookie with name from the request headers
 * @param {Request} request incoming Request
 * @param {string} name of the cookie to grab
 */
function getCookie(request, name) {
  let result = null;
  let cookieString = request.headers.get("Cookie");
  if (cookieString) {
    let cookies = cookieString.split(";");
    cookies.forEach((cookie) => {
      let cookieName = cookie.split("=")[0].trim();
      if (cookieName === name) {
        let cookieVal = cookie.split("=")[1];
        result = cookieVal;
      }
    });
  }
  return result;
}
