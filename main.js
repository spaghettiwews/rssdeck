'use strict';

document.addEventListener("DOMContentLoaded", function () {
    try {
        if (localStorage) {

            // Get feeds from localstorage and unserialise data into array
            let feeds = JSON.parse(localStorage.getItem("rssdeck.feeds"));
            if (feeds != null && feeds != undefined && feeds != '') {

                if (feeds.length > 0) {
                    // Create feed columns based on the number of feeds in feeds[]
                    createColumns(feeds.length);

                    // Cycle through the feeds and populate the columns with the RSS content from each one
                    feeds.forEach(function (feed, findex, feeds) {
                        renderFeed(feed, findex);
                    });
                }

            } else {

                //If no key named rssdeck.feeds in localstorage, then create one and instantiate it with an empty array (serialised)
                let feeds = [];
                saveToLocal("rssdeck.feeds", JSON.stringify(feeds));
            }

            //Create handler for saving feed urls to localstorage
            document.querySelector("form").addEventListener("submit", function (event) {
                let feeds = JSON.parse(localStorage.getItem("rssdeck.feeds"));
                event.preventDefault();
                if (!feeds.includes(this.querySelector("input").value)) {
                    feeds.push(this.querySelector("input").value);

                    if (saveToLocal("rssdeck.feeds", JSON.stringify(feeds))) {
                        createColumns(1);
                    }
                    let lastFeedIndex = document.querySelectorAll(".feed").length - 1;
                    renderFeed(this.querySelector("input").value, lastFeedIndex);
                }

                this.reset();
            });

        }

    } catch (err) {
        console.error(err);
    }
});

let createColumns = function (count) {
    let container = document.querySelector(".container");
    container.classList.remove("nothing");
    for (let i = 0; i < count; i++) {
        let column = document.createElement("div");
        let ol = document.createElement("ol");
        column.setAttribute("class", "feed");
        column.appendChild(ol);
        container.appendChild(column);
    }
}

let saveToLocal = function (key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    }
    catch(error) {
        return false;
    }
}

let renderFeed = async function(feed, findex) {
    let response = await fetch(`https://be-cors-why-not.herokuapp.com/${feed}`);
    let data = await response.text();

    let parser = new DOMParser();
    let doc = parser.parseFromString(data, "text/xml");
    let docObject = parse(doc);

    console.log(doc);
    console.log(docObject);

    // Get the feed title and url
    let feedTitle = docObject.channel.title ? docObject.channel.title : 'No Title';
    let feedUrl = docObject.channel.link ? docObject.channel.link : '#';
    let h3 = document.createElement("h3");
    let a = document.createElement("a");
    let regex = /((https)|(http)):\/\//gi;
    a.href = feedUrl;
    let feedUrlText = feedUrl ? feedUrl.replace(regex, '') : '';
    a.innerHTML = feedUrlText.substring(0, feedUrlText.indexOf('/') != -1 ? feedUrlText.indexOf('/') : feedUrlText.length);
    h3.innerHTML = feedTitle;
    h3.prepend(a);
    document.querySelectorAll(".feed")[findex].prepend(h3);

    // Get the feed image/icon
    // let imageUrl = docObject.channel.image ? docObject.channel.image.url : '';
    // let img = document.createElement("img");
    // img.setAttribute("src", imageUrl);
    // document.querySelectorAll(".feed")[findex].prepend(img);

    let posts = docObject.channel.item;
    posts.forEach(function (post, pindex, posts) {
        let li = document.createElement("li");
        let a = document.createElement("a");
        let time = document.createElement("time");
        a.innerHTML = post.title;
        a.href = post.link;
        a.target = "_blank";
        li.appendChild(a);
        li.appendChild(time);
        document.querySelectorAll(".feed")[findex].querySelector("ol").appendChild(li);
    });
}

// flattens an object (recursively!), similarly to Array#flatten
// e.g. flatten({ a: { b: { c: "hello!" } } }); // => "hello!"
function flatten(object) {
    var check = _.isPlainObject(object) && _.size(object) === 1;
    return check ? flatten(_.values(object)[0]) : object;
}

function parse(xml) {
    var data = {};

    var isText = xml.nodeType === 3,
        isElement = xml.nodeType === 1,
        body = xml.textContent && xml.textContent.trim(),
        hasChildren = xml.children && xml.children.length,
        hasAttributes = xml.attributes && xml.attributes.length;

    // if it's text just return it
    if (isText) {
        return xml.nodeValue.trim();
    }

    // if it doesn't have any children or attributes, just return the contents
    if (!hasChildren && !hasAttributes) {
        return body;
    }

    // if it doesn't have children but _does_ have body content, we'll use that
    if (!hasChildren && body.length) {
        data.text = body;
    }

    // if it's an element with attributes, add them to data.attributes
    if (isElement && hasAttributes) {
        data.attributes = _.reduce(xml.attributes, function (obj, name, id) {
            var attr = xml.attributes.item(id);
            obj[attr.name] = attr.value;
            return obj;
        }, {});
    }

    // recursively call #parse over children, adding results to data
    _.each(xml.children, function (child) {
        var name = child.nodeName;

        // if we've not come across a child with this nodeType, add it as an object
        // and return here
        if (!_.has(data, name)) {
            data[name] = parse(child);
            return;
        }

        // if we've encountered a second instance of the same nodeType, make our
        // representation of it an array
        if (!_.isArray(data[name])) {
            data[name] = [data[name]];
        }

        // and finally, append the new child
        data[name].push(parse(child));
    });

    // if we can, let's fold some attributes into the body
    _.each(data.attributes, function (value, key) {
        if (data[key] != null) {
            return;
        }
        data[key] = value;
        delete data.attributes[key];
    });

    // if data.attributes is now empty, get rid of it
    if (_.isEmpty(data.attributes)) {
        delete data.attributes;
    }

    // simplify to reduce number of final leaf nodes and return
    return flatten(data);
}