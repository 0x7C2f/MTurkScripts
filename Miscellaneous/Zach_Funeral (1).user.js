// ==UserScript==
// @name         Zach_Funeral
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Parse Zach funeral homes
// @author       You
// @include        http://*.mturkcontent.com/*
// @include        https://*.mturkcontent.com/*
// @include        http://*.amazonaws.com/*
// @include        https://*.amazonaws.com/*
// @include https://worker.mturk.com/*
// @grant  GM_getValue
// @grant GM_setValue
// @grant GM_deleteValue
// @grant GM_addValueChangeListener
// @grant GM_setClipboard
// @grant GM_xmlhttpRequest
// @grant GM_openInTab
// @grant GM_getResourceText
// @grant GM_addStyle
// @grant GM_cookie
// @grant GM.cookie
// @connect google.com
// @connect bing.com
// @connect yellowpages.com
// @connect *
// @require https://raw.githubusercontent.com/hassansin/parse-address/master/parse-address.min.js
// @require https://raw.githubusercontent.com/jacobmas/MTurkScripts/0ab5af65f540ae26963c977fe2d16321bd5df125/js/MTurkScript.js
// @require https://raw.githubusercontent.com/jacobmas/MTurkScripts/master/Govt/Government.js
// @require https://raw.githubusercontent.com/jacobmas/MTurkScripts/master/global/Address.js
// @require https://raw.githubusercontent.com/jacobmas/MTurkScripts/master/global/AggParser.js
// @require https://raw.githubusercontent.com/jacobmas/MTurkScripts/master/Email/MailTester.js
// @require https://raw.githubusercontent.com/spencermountain/compromise/master/builds/compromise.min.js
// @resource GlobalCSS https://raw.githubusercontent.com/jacobmas/MTurkScripts/master/global/globalcss.css
// ==/UserScript==

(function() {
    'use strict';
    var my_query = {};
    var bad_urls=["us-funerals.com",".bestflowers.com",".facebook.com",".yahoo.com",'.yellowpages.com','.bbb.org',"linkedin.com","funeralhomesguide.com"];
    /* TODO should be requester #, last field should be if it's crowd or not */
    var MTurk=new MTurkScript(24000,750+(Math.random()*1000),[],begin_script,"A2M54IAM74TC8X",true);
    var MTP=MTurkScript.prototype;
    function is_bad_name(b_name)
    {
        return false;
    }

    function query_response(response,resolve,reject,type) {
        var doc = new DOMParser()
        .parseFromString(response.responseText, "text/html");
        console.log("in query_response\n"+response.finalUrl+", type="+type);
        var search, b_algo, i=0, inner_a;
        var b_url="crunchbase.com", b_name, b_factrow,lgb_info, b_caption,p_caption;
        var b1_success=false, b_header_search,b_context,parsed_context,parsed_lgb;
        try
        {
            search=doc.getElementById("b_content");
            b_algo=search.getElementsByClassName("b_algo");
            lgb_info=doc.getElementById("lgb_info");
            b_context=doc.getElementById("b_context");
            console.log("b_algo.length="+b_algo.length);
            if(type==="query" && b_context&&(parsed_context=MTP.parse_b_context(b_context))) {
                console.log("parsed_context="+JSON.stringify(parsed_context));
                if(parsed_context.Address) {
                    let temp_add=new Address(parsed_context.Address);
                    console.log(temp_add);
                    if(temp_add.city&&temp_add.state&&temp_add.postcode&&temp_add.address1) {
                        my_query.fields.address=temp_add.address1;

                        my_query.fields.city_state_zip=temp_add.city+", "+temp_add.state+" "+temp_add.postcode;
                    }
                }
                if(parsed_context.Phone) my_query.fields.phone=parsed_context.Phone;
                if(parsed_context.Title && !/…/.test(parsed_context.Title)) my_query.fields.fh_name=parsed_context.Title;
                if(parsed_context.url && !MTP.is_bad_url(parsed_context.url,bad_urls,-1)) {

                    my_query.fields.website_url="www."+MTP.get_domain_only(parsed_context.url);
                    resolve(parsed_context.url);
                    return;
                }
            }
            if(lgb_info&&(parsed_lgb=MTP.parse_lgb_info(lgb_info))) {
                console.log("parsed_lgb="+JSON.stringify(parsed_lgb));
                if(parsed_lgb.address) {
                    let temp_add=new Address(parsed_lgb.address);
                    console.log(temp_add);
                    my_query.fields.address=temp_add.address1;
                    my_query.fields.city_state_zip=temp_add.city+", "+temp_add.state+" "+temp_add.postcode;
                }
                if(parsed_lgb.phone) my_query.fields.phone=parsed_lgb.phone;
            }
            for(i=0; i < b_algo.length&&i<4; i++) {
                if(i>1 && !/query/.test(type)) break;
                b_name=b_algo[i].getElementsByTagName("a")[0].textContent;
                b_url=b_algo[i].getElementsByTagName("a")[0].href;
                b_caption=b_algo[i].getElementsByClassName("b_caption");
                p_caption=(b_caption.length>0 && b_caption[0].getElementsByTagName("p").length>0) ?
                    p_caption=b_caption[0].getElementsByTagName("p")[0].innerText : '';
                console.log("("+i+"), b_name="+b_name+", b_url="+b_url+", p_caption="+p_caption);
                if(type==="query" && !MTurkScript.prototype.is_bad_url(b_url, bad_urls,4,2) && !MTurkScript.prototype.is_bad_name(b_name,my_query.name,p_caption,i)
		   && (b1_success=true)) break;
                if(type==="bbb" && !/\/category\//.test(b_url) && !MTurkScript.prototype.is_bad_name(
                                    b_name.replace(/\s-\s.*$/,""),my_query.name,p_caption,i)
                    && (b1_success=true)) break;
                if(type==="fb" && !MTP.is_bad_fb(b_url) && !MTurkScript.prototype.is_bad_name(
                                    b_name,my_query.name,p_caption,i) && !/Police/.test(b_name)
                    && (b1_success=true)) break;
                if(type==="buzzfile" && !/\/category\//.test(b_url) && !MTurkScript.prototype.is_bad_name(
                                    b_name.replace(/\s-\s.*$/,"").replace(/ in .*/,""),my_query.name,p_caption,i)// && b_name.match(", "+my_query.state)
		   && (b1_success=true)) break;
            }
            if(b1_success && (resolve(b_url)||true)) return;
        }
        catch(error) {
            reject(error);
            return;
        }
	do_next_query(resolve,reject,type);
        return;
    }
    function do_next_query(resolve,reject,type) {
       /* if(type==="query" && my_query.fields.fh_name!=undefined) {
            query_search(my_query.name+" "+my_query.city+" "+my_query.state+" site:bbb.org",resolve,reject,query_response,"bbb");
            return;
        }*/
        if(type==="bbb" && my_query.fields.fh_name!=undefined && my_query.try_count[type]===0) {
            my_query.try_count[type]+=1;
            query_search(my_query.name+" "+my_query.state+" site:bbb.org",resolve,reject,query_response,"bbb");
            return;
        }
        reject("Nothing found");
    }

    /* Search on bing for search_str, parse bing response with callback */
    function query_search(search_str, resolve,reject, callback,type,filters) {
        console.log("Searching with bing for "+search_str);
        if(!filters) filters="";
        var search_URIBing='https://www.bing.com/search?q='+
            encodeURIComponent(search_str)+"&filters="+filters+"&first=1&rdr=1";
        GM_xmlhttpRequest({method: 'GET', url: search_URIBing,
                           onload: function(response) { callback(response, resolve, reject,type); },
                           onerror: function(response) { reject("Fail"); },ontimeout: function(response) { reject("Fail"); }
                          });
    }

    /* Following the finding the district stuff */
    function query_promise_then(result) {
        var promise;
        console.log("result="+result);


        if(/\.facebook\.com\//.test(result)) {
            my_query.fields.website_url="www.Facebook page only";
            promise=MTP.create_promise(result.replace(/\/$/,"")+"/about",parse_FB_about,parse_facebook_then,function(response) { console.log("Error parsing Facebook "+response); });
        }
        else
        {
           my_query.fields.website_url="www."+MTP.get_domain_only(result);
            console.log("result="+result);
           /* if(!/dignitymemorial\.com/.test(result)) {
                result=result.replace(/^(https?:\/\/([^\/]*)).*$/,"$1"); }*/
            promise=MTP.create_promise(result,parse_funeral_home,parse_home_then,function(response) { console.log("Error parsing");
                                                                                                    my_query.done.query=true;
                                                                                                     submit_if_done();
                                                                                                    });
        }
    }

    function fb_promise_then(result) {
        console.log("fb_promise_then,result="+result);
        result=result.replace(/(https?:\/\/www\.facebook\.com\/[^\/]*)\/.*$/,"$1").    replace(/\/posts\/.*$/,"");
        var promise;
        result=result.replace(/https?:\/\/m\.facebook\.com\//,"https://www.facebook.com/").replace(/\/$/,"")+"/about/?ref=page_internal";
        console.log("result="+result);
        my_query.fb_url=result;



        promise=MTP.create_promise(result,MTP.parse_FB_about,parse_facebook_then,function(response) { console.log("Error parsing Facebook "+response); },"",
                                   {},{"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36"});

    }
    function parse_FB_home(doc,url,resolve,reject) {
        console.log("parse_FB_home: url="+url);
        console.log(doc);
        //console.log(doc.body.innerHTML);
        var stuff,x;
        stuff=doc.querySelectorAll(".cq");
        for(x of stuff) {
            console.log(x);
        }

        resolve("fb");
    }

    function get_quality(curr) {
        var ret=0;
        if(curr.name) ret+=1;

        console.log("nlp="+nlp(curr.name).people().json().length);
        if(nlp(curr.name).people().json().length>0) ret+=2;
        if(curr.name.length>=1 && curr.name.substr(0,1).toUpperCase()===curr.name.substr(0,1)) ret+=5;
        if(curr.title) ret+=1;
        if(curr.title && /Manager|Director/.test(curr.title)) ret+=3;

        if(curr.title && /Owner|CEO|President/.test(curr.title)) ret+=15;
        if(/Former/.test(curr.title) || (/\-\s*[\d]{4}/.test(curr.title))) ret-=3;
        if(curr.email) ret+=3;
        if(curr.phone) ret+=1;
        if(!curr.name||(curr.name&&/Funeral|((^| )(Home|Our)( |$))/i.test(curr.name))||(/\s+Box/.test(curr.title))) ret=0;
        if(/^LLC( |$)/.test(curr.title)) ret=0;
        if(/\s(Rd\.|Dr\.|St\.|Blvd\.)/.test(curr.name)) ret=0;
        return ret;
    }

  
    function bbb_promise_then(result) {
        var promise;
        if(/\.bbb\.org\//.test(result)) {
            /*    if(my_query.checkboxes.fh_provider==='') {
                my_query.checkboxes.fh_provider="other";
                my_query.fields.fh_provider_other="None";
            }*/
            //if(!my_query.fields.website_url) my_query.fields.website_url="www.Not Found";
            //if(!my_query.fields.fh_email) my_query.fields.fh_email="Not Found";
            promise=MTP.create_promise(result,AggParser.parse_bbb,parse_bbb_then,function(response) {
                my_query.done.bbb=true;
                submit_if_done();
                console.log("Error parsing bbb"+response); });
        }
    }
    function parse_bbb_then(result) {
        console.log("result="+JSON.stringify(result));
        var x;
        for(x of result) {
            let curr={name:x.first+" "+x.last,title:x.title};
            my_query.staff_list.push(new Person(curr,"","",get_quality(curr)-2));
        }
        assign_owner(my_query.staff_list);
        my_query.done.bbb=true;
        submit_if_done();
    }
    function buzzfile_promise_then(result) {
        var promise;
//        if(!my_query.fields.website_url) my_query.fields.website_url="www.Not Found";
 //       if(!my_query.fields.fh_email) my_query.fields.fh_email="Not Found";
        promise=MTP.create_promise(result,AggParser.parse_buzzfile,parse_buzzfile_then,function(response) {
                my_query.done.buzzfile=true;
                submit_if_done();
                console.log("Error parsingbuzzfile"+response); });

    }
     function parse_buzzfile_then(result) {
        console.log("buzzfile result="+JSON.stringify(result));

        if(result.name && result.title) {
            my_query.staff_list.push(new Person({name:result.name,title:result.title},"","",4));
            assign_owner(my_query.staff_list);
        }

        my_query.done.buzzfile=true;
        submit_if_done();
    }

   

    function parse_funeral_home(doc,url,resolve,reject) {
        var temp;
        if(/www\.dignitymemorial\.com/.test(url)) {
            console.log("dignity,url="+url);
            parse_dignity(doc,url,resolve,reject);
            return;
        }
        if(((temp=doc.querySelector(".copyright a")) && /Batesville/.test(temp.innerText)) ||
          (temp=doc.querySelector("a[href*='.batesvilletechnology.com']"))) {
            parse_batesville(doc,url,resolve,reject);
            return;
        }
        if(((temp=doc.querySelector(".site-credit a")) || (temp=doc.querySelector(".credits a")))

           && /consolidatedfuneralservices\.com/.test(temp.href)) {
            console.log("temp="+temp);
             parse_CFS(doc,url,resolve,reject);

            return;
        }
        if(((temp=doc.querySelector(".copyrights .underline")) && /frazerconsultants\.com/.test(temp.href)) ||
          (temp=doc.querySelector("a[href*='frazerconsultants']"))) {
            console.log("temp="+temp);
             parse_frazer(doc,url,resolve,reject);
            return;
        }
        if((temp=doc.querySelector("a[href*='frontrunner360.com']"))||((temp=doc.querySelector("a[href*='.frontrunnerpro.com']")))) {
            parse_frontrunner(doc,url,resolve,reject);
            return;
        }
        if((temp=doc.querySelector("a[href*='.funeralone.com']"))) {
            parse_funeralone(doc,url,resolve,reject);
            return;
        }
        if((temp=doc.querySelector("a[href*='.funeralnet.com']"))) {
            parse_funeralnet(doc,url,resolve,reject);
            return;
        }
         if((temp=doc.querySelector("a[href*='.funeraltech.com']"))) {
            parse_funeraltech(doc,url,resolve,reject);
            return;
        }
          if((temp=doc.querySelector("a[href*='\/\/funeralresults\.com']"))) {
            parse_frm(doc,url,resolve,reject);
            return;
        }
        if((temp=doc.querySelector("a[href*='.remembertributes.info']"))) {
           my_query.checkboxes.fh_provider="other";
                my_query.fields.fh_provider_other="Remember Tributes";
        }
                if((temp=doc.querySelector("a[href*='.funeralhomewebsite.com']"))) {
           my_query.checkboxes.fh_provider="other";
                my_query.fields.fh_provider_other="funeralhomewebsite.com";
        }
        else if((temp=doc.querySelector("a[href*='\.articdesigns\.com']"))) {
             my_query.checkboxes.fh_provider="other";
                my_query.fields.fh_provider_other="Artic Designs";
        }
        else if((temp=doc.querySelector(".footer-text")) && /Designed by Life Celebration Inc/.test(temp.innerText)) {
            my_query.checkboxes.fh_provider="other";
                my_query.fields.fh_provider_other="Life Celebration Inc.";
        }

        else {


            my_query.checkboxes.fh_provider="other";
            my_query.fields.fh_provider_other="None";
            var footer_a=doc.querySelectorAll("footer a");
            if(footer_a.length===0) footer_a=doc.querySelectorAll("#footer a");
            if(footer_a.length>0) {

                var j;
                let domain=MTP.get_domain_only(url,true);
                for(j=footer_a.length-1; j>=0; j--) {
                    if(!footer_a[j].href) continue;
                    let last_link=MTP.fix_remote_url(footer_a[j].href,url);
                    console.log("Last_link="+last_link);
                    if(last_link&&last_link.length>0&&!MTP.is_bad_url(last_link,bad_urls,-1)&&/http/.test(last_link) && last_link.indexOf(domain)===-1) {
                        my_query.fields.fh_provider_other=last_link;
                        break;
                    }
            }
        }
            let x;
            for(x of footer_a) {
                if(/ by /.test(x.innerText)) {
                    my_query.fields.fh_provider_other=x.innerText.replace(/^.* by /,"");
                }
            }
        }
            var query={dept_regex_lst:[/Staff/],title_regex_lst:[/Owner/,/Manager/,/Director/]};
        var promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,query);

    }
    function parse_facebook_then(result) {
        console.log("FB result="+JSON.stringify(result));
        let add=new Address(result.address+" 12345");
        console.log(add);
         if(!my_query.fields.fh_name && result.pageTitle) {
                    my_query.fields.fh_name=result.pageTitle.replace(/\s[-\|]+\s.*$/,"");
                }
        if(

           !result.address || (result.url && MTP.get_domain_only(result.url,true)===MTP.get_domain_only(my_query.fields.website_url,true)) || (add.city&&add.state&&(add.city.toLowerCase()===my_query.city.toLowerCase()) &&
           ((add.state===my_query.state)||(reverse_state_map[add.state]===my_query.state)))) {
            if(!/@/.test(my_query.fields.fh_email) && result.email) {
                console.log("Setting email");

                my_query.fields.fh_email=result.email;
            }
            else {
                console.log("add.state="+add.state+", my_query.state="+my_query.state+", add.state==my_query.state="+(add.state===my_query.state));
            }
            if(result.url && my_query.done.query&&(!my_query.fields.website_url||/Not Found/.test(my_query.fields.website_url))) {
                console.log("Found fb website="+result.url);
                my_query.done.query=false;
                var query_str="crowd-checkbox[name='fh_provider'][value='other']";
                if(document.querySelector(query_str)) {
                    console.log("hello");
                    document.querySelector(query_str).click();
                    my_query.checkboxes.fh_provider="none";
                }
                my_query.fields.fh_provider_other="";
                query_promise_then(result.url);
            }
        }
        else if(result.url) {
            console.log("FB: bad match, MTP.get_domain_only(result.url)="+MTP.get_domain_only(result.url,true)+",MTP.get_domain_only(my_query.fields.website_url)="+
                        MTP.get_domain_only(my_query.fields.website_url,true));
        }
        my_query.done.fb=true;
        submit_if_done();

    }

    function parse_funeraltech(doc,url,resolve,reject) {
                my_query.checkboxes.fh_provider="funeral_tech";
        var a=doc.querySelectorAll("a"),x,new_url="",promise;
        for(x of a) {
            x.href=MTP.fix_remote_url(x.href,url);
            if(/Staff|Team/i.test(x.innerText)) {
                console.log("x.href="+x.href+", x.innerText="+x.innerText);
                new_url=x.href;
                break;
            }
        }
        if(new_url) promise=MTP.create_promise(new_url,parse_funeraltech_staff,resolve,reject);
        else promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,{dept_regex_lst:[/Staff/],title_regex_lst:[/Owner/,/Manager/]});
    }
    function parse_funeraltech_staff(doc,url,resolve,reject) {
        console.log("parse_funeraltech_staff,url="+url);
        var employees=doc.querySelectorAll(".content-placeholder");
        var x,name,title,email,set_yet=false;
        for(x of employees) {
            name=x.querySelector("a span");
            title=x.querySelector("em span");
            email=x.querySelector("a[href^='mailto']");
            if(!title || !name) continue
            console.log(name);
            console.log(title);
            console.log(title.firstChild);
            let curr={name:name?name.innerText.trim():"",title:title&&title.firstChild?title.firstChild.textContent.trim():"",
                      email:email?email.href.replace(/^\s*mailto:\s*/,""):"",phone:""};
            console.log(curr);
            if(curr&&curr.title) {
                my_query.staff_list.push(new Person(curr,"","",get_quality(curr)));
            }
        }

        assign_owner(my_query.staff_list);

        if(my_query.fields.fh_email.length==0) my_query.fields.fh_email="Not Found";
        if(my_query.staff_list.length===0) {
            var query={dept_regex_lst:[/Staff/],title_regex_lst:[/Owner/,/Manager/,/Director/]};
        var promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,query);
        }
        else resolve("frazer");


    }

    function parse_frm(doc,url,resolve,reject) {
                my_query.checkboxes.fh_provider="frm";
        var query={dept_regex_lst:[/Staff/],title_regex_lst:[/Owner/,/Manager/,/Director/]};
        var promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,query);
    }

    function parse_funeralnet(doc,url,resolve,reject) {
                my_query.checkboxes.fh_provider="funeral_net";
        var fb;
        if(!my_query.fb_url && (fb=doc.querySelector("a[href*='www.facebook.com/']"))) {
            my_query.done.fb=false;
            fb_promise_then(fb.href);
        }
        var query={dept_regex_lst:[/Staff/],title_regex_lst:[/Owner/,/Manager/,/Director/]};
        var promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,query);
    }

    function parse_funeralone(doc,url,resolve,reject) {
        my_query.checkboxes.fh_provider="funeral_one";
        var fb;
        var a=doc.querySelectorAll("a"),x,new_url="",promise;
        if(!my_query.fb_url && (fb=doc.querySelector("a[href*='www.facebook.com/']"))) {
            my_query.done.fb=false;
            fb_promise_then(fb.href);
        }
        for(x of a) {
            x.href=MTP.fix_remote_url(x.href,url);
            if(/Staff|Team/i.test(x.innerText)) {
                console.log("x.href="+x.href+", x.innerText="+x.innerText);
                new_url=x.href;
                break;
            }
        }
        let email=doc.querySelector("a[href*='cdn-cgi/']"),enc;
        if(email&&(enc=email.href.match(/#(.*)$/))) {
            console.log("enc="+enc);
            my_query.fields.fh_email=MTP.cfDecodeEmail(enc[1]);
        }
        console.log(new_url);
        
        if(new_url) {
            promise=MTP.create_promise(new_url,parse_funeralone_staff,resolve,reject);
        }
        else {
            let promise_list=[];
            promise_list.push(MTP.create_promise(url.replace(/\/$/,"")+"/who-we-are/our-valued-staff",parse_funeralone_staff,function() { },reject));
            promise_list.push(MTP.create_promise(url.replace(/\/$/,"")+"/who-we-are/history-and-staff",parse_funeralone_staff,function() { },reject));
            Promise.all(promise_list).then(resolve);
        }

        return;
    }

    function parse_funeralone_staff(doc,url,resolve,reject) {
         console.log("parse_funeralone,url="+url);
         var staff=doc.querySelectorAll(".valued-staff h4");
         var x,curr,name,title;
         for(x of staff) {
             console.log("x="+x);
             name=x.innerText.trim().replace(/[,\n].*$/,"");
             title=x.innerText.trim().replace(/^[^,\n]*[,\n]\s*/,"");
             curr={name:name,title:title};
             if(name && title) {
                 my_query.staff_list.push(new Person(curr,"","",get_quality(curr)));
             }
         }

         console.log("staff_list="+JSON.stringify(my_query.staff_list));
         assign_owner(my_query.staff_list);
         if(my_query.staff_list.length===0) {
             var query={dept_regex_lst:[/Staff/],title_regex_lst:[/Owner/,/Manager/]};
             var promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,query);
         }
         else resolve("funeralone");
     }

    function parse_frontrunner(doc,url,resolve,reject) {
        my_query.checkboxes.fh_provider="front_runner";
        var fb;
        var visit_site=false;
        if(!my_query.fb_url && (fb=doc.querySelector("a[href*='www.facebook.com/']"))) {
            my_query.done.fb=false;
            fb_promise_then(fb.href);
        }
        var a=doc.querySelectorAll("a"),x,new_url="",promise,temp_add,y,p,span;
        for(x of a) {
            x.href=MTP.fix_remote_url(x.href,url);
            if(/Staff|Team/i.test(x.innerText)) {
                console.log("x.href="+x.href+", x.innerText="+x.innerText);
                new_url=x.href;
                break;
            }
            else if(/Visit Website/i.test(x.innerText) && MTP.get_domain_only(x.href)!=MTP.get_domain_only(url)) visit_site=true;
        }
        if(visit_site) {
            var dm=doc.querySelectorAll(".dmContent section .dmRespRow .dmRespCol");
            for(x of dm) {
                p=x.querySelector("p");
                let temp_add_str="";
                if(p) {
                    for(y of p.querySelectorAll("span")) temp_add_str=temp_add_str+y.innerText.trim()+'\n';
                    temp_add=new Address(temp_add_str.trim());
                    if(temp_add&&temp_add.address1&&temp_add.city&&temp_add.state&&
                       temp_add.address1.replace(/\s.*$/,"")===my_query.street.replace(/\s.*$/,"") && temp_add.city===my_query.city && temp_add.state===my_query.state) {
                        console.log("Found correct at ");
                        console.log("temp_add="+JSON.stringify(temp_add));
                        a=x.querySelector("a[href^='http']");
                        if(a) {
                            promise=MTP.create_promise(a.href,parse_frontrunner,resolve,reject);
                            return;
                        }
                    }

                }
            }
            console.log("VISIT site");
        }

        if(new_url) promise=MTP.create_promise(new_url,parse_frontrunner_staff,resolve,reject);
        else promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,{dept_regex_lst:[/Staff/],title_regex_lst:[/Owner/,/Manager/]});

     
    }

    function parse_frontrunner_staff(doc,url,resolve,reject) {
        console.log("parse_frontrunner_staff,url="+url);
        var staff=doc.querySelectorAll("#dm_content .dmRespRow.fullBleedMode > .dmRespColsWrapper > .dmRespCol");
        if(staff.length===0) staff=doc.querySelectorAll("#dm_content .dmRespRow > .dmRespColsWrapper > .dmRespCol");
        var x,name,title,email,curr;

        for(x of staff) {
            name=x.querySelector("h2");
            if(!name) continue;
            let y,z=name.querySelectorAll("span");
            for(y of z) {
                y.remove(); }
            title=x.querySelector("h4")||x.querySelector("b")||x.querySelector("h3");
            email=x.querySelector("a[href^='mailto']");
            curr={name:name?name.innerText.trim():"",title:title?title.innerText.trim():"",email:email?email.href.replace(/\s*mailto:\s*/,""):""};
            if(curr&&curr.name&&curr.title) {
                 my_query.staff_list.push(new Person(curr,"","",get_quality(curr)));
            }
        }


        assign_owner(my_query.staff_list);
        let email2=doc.querySelector("a[href^='mailto']");
        if(my_query.fields.fh_email.length===0 || my_query.fields.fh_email==="Not Found") {
            if(email2) my_query.fields.fh_email=email2.href.replace(/\s*mailto:\s*/,"");
            else my_query.fields.fh_email="Not Found";
        }
         if(staff.length===0) {
            var promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,{dept_regex_lst:[/Staff/],title_regex_lst:[/Owner/,/Manager/]});
        }
        else resolve("frontrunner");
        //
    }

    function parse_frazer(doc,url,resolve,reject) {
        my_query.checkboxes.fh_provider="frazer_consultants";
        my_query.fields.fh_email="Not Found";
        var about_url="";
        var fb;
        if(!my_query.fb_url && (fb=doc.querySelector("a[href*='www.facebook.com/']"))) {
            my_query.done.fb=false;
            fb_promise_then(fb.href);
        }
         var a=doc.querySelectorAll("a"),x,new_url="",promise;
        for(x of a) {
            x.href=MTP.fix_remote_url(x.href,url);
            if(/Staff|Team/i.test(x.innerText)) {
                console.log("x.href="+x.href+", x.innerText="+x.innerText);
                new_url=x.href;
                break;
            }
            else if(/About/.test(x.innerText) && !about_url && !/about/i.test(url)&&!my_query.about_frazer) about_url=x.href;

        }
        if(new_url) promise=MTP.create_promise(new_url,parse_frazer_staff,resolve,reject);
        else if(about_url) {
            my_query.about_frazer=true;
            promise=MTP.create_promise(about_url,parse_frazer,resolve,reject);
            return;
        }

        else {

            promise=MTP.create_promise(url+"/who-we-are/staff",parse_frazer_staff,resolve,reject);
        }
    }
    function parse_frazer_staff(doc,url,resolve,reject) {
        console.log("parse_frazer_staff,url="+url);
        var employees=doc.querySelectorAll(".employee");
        var x,name,title,email,set_yet=false;
        for(x of employees) {
            name=x.querySelector(".emp-name");
            title=x.querySelector(".emp-job-title");
            email=x.querySelector(".emp-email");
            let curr={name:name?name.innerText.trim():"",title:title?title.innerText.trim():"",email:email?email.href.replace(/^\s*mailto:\s*/,""):"",phone:""};
            if(curr.name) {
                my_query.staff_list.push(new Person(curr,"","",get_quality(curr)));
            }
            
        }
        if(employees.length===0 && (employees=doc.querySelectorAll("div.staff div.text-center")).length>0) {
            for(x of employees) {
                name=x.querySelector("h4");
                title=x.querySelector("p");
                email="";
                let curr={name:name?name.innerText.trim():"",title:title?title.innerText.trim():"",email:email?email.href.replace(/^\s*mailto:\s*/,""):"",phone:""};
                if(curr.name) {
                    my_query.staff_list.push(new Person(curr,"","",get_quality(curr)));
                }
            }
        }

        assign_owner(my_query.staff_list);

        if(my_query.fields.fh_email.length==0) my_query.fields.fh_email="Not Found";
        resolve("frazer");


    }

    function assign_owner(staff_list) {
        staff_list.sort(comparequal);
        if(staff_list.length>0&&staff_list[0].quality>0) {
            let staff_item=staff_list[0];
            console.log("staff_list="+JSON.stringify(staff_list));
            try {

                my_query.fields.owner_first_name=staff_item.first;
                my_query.fields.owner_last_name=staff_item.last;
                my_query.fields.owner_title=staff_item.title;
                my_query.fields.owner_email=staff_item.email;
                my_query.fields.owner_phone=staff_item.phone;
            }
            catch(error) { }
            if((!my_query.fields.fh_email || !/@/.test(my_query.fields.fh_email)) && /@/.test(my_query.fields.owner_email)) my_query.fields.fh_email=my_query.fields.owner_email;

        }
        else
        {
             if(!my_query.fields.fh_email) my_query.fields.fh_email="Not Found";
            if(!my_query.fields.owner_first_name) my_query.fields.owner_first_name=my_query.fields.owner_last_name="Not Found";
        }
    }

    function parse_CFS(doc,url,resolve,reject) {
        my_query.checkboxes.fh_provider="cfs";
        if(my_query.fields.owner_first_name==='') my_query.fields.owner_first_name=my_query.fields.owner_last_name="Not Found";
        var email=doc.querySelector(".emailli");
        if(email&&email.dataset.l&&email.dataset.r) {
            my_query.fields.fh_email=email.dataset.l+"@"+email.dataset.r.replace(/%/g,".");
        }
        else if(my_query.fields.fh_email==='') my_query.fields.fh_email="Not Found";
        var a=doc.querySelectorAll("a"),x,new_url="",promise;
        for(x of a) {
            x.href=MTP.fix_remote_url(x.href,url);
            if(/Staff|Team/i.test(x.innerText)) {
                console.log("x.href="+x.href+", x.innerText="+x.innerText);
                new_url=x.href;
                break;
            }
        }
        if(new_url) promise=MTP.create_promise(new_url,parse_CFS_staff,resolve,reject);
        else promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,{dept_regex_lst:[/Staff/],title_regex_lst:[/Owner/,/Manager/]});
    }
    
    function parse_CFS_staff(doc,url,resolve,reject) {
        function get_CFS_title(staff) {
            let div=staff.querySelectorAll("div"),x;
            for(x of div) {

                if(/Manager|Owner/.test(x.innerText)) return x.innerText;
            }
            return "";

        }
        var promise;
        var staffitem=doc.querySelectorAll(".staffitem");
        var staff,name,title,email,phone,curr;
        for(staff of staffitem) {
            curr={};
            name=staff.querySelector("h3")||staff.querySelector("h4");
            title=staff.querySelector("em");
            if(!title) title=get_CFS_title(staff);

            phone=staff.querySelector("a[href^='tel']");
            email=staff.querySelector(".cfs-obemfld");
            curr={name:name&&name.innerText?name.innerText.trim():"",title:title&&title.innerText?title.innerText.trim():"",
                  phone:phone&&phone.innerText?phone.innerText.trim():"",email:""};
            if(email) curr.email=email.dataset.p1+"@"+email.dataset.p2.replace(/%/g,".");
            try {
                if(curr.name) my_query.staff_list.push(new Person(curr,"","",get_quality(curr)));
            }
            catch(exception) { console.log("exception="+exception); }
        }
         assign_owner(my_query.staff_list);
        if(my_query.staff_list.length===0||my_query.staff_list[0].quality===0) {
                        var query={dept_regex_lst:[/Staff/,/Team/],title_regex_lst:[/Owner/,/Manager/]};

            promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,query);
            return;
        }
        else resolve("CFS");
    }

    function parse_batesville(doc,url,resolve,reject) {
        my_query.checkboxes.fh_provider="batesville";
        var email=doc.querySelector("span.__cf_email__");
        if(email && email.dataset.cfemail) {
            let parsed_email=MTP.cfDecodeEmail(email.dataset.cfemail);
            my_query.fields.fh_email=parsed_email;
        }
        else my_query.fields.fh_email="Not Found";
        var promise=MTP.create_promise(url.replace(/\/$/,"")+"/staff",parse_batesville_staff,resolve,reject);

    }
    function comparequal(a,b) { return b.quality-a.quality; }
    function parse_batesville_staff(doc,url,resolve,reject) {
        console.log("parse_batesville_staff,url="+url);
        var staff=doc.querySelectorAll(".who-we-are-tab-section .tab-pane"),name,title,email,phone;
        if(staff.length===0) staff=doc.querySelectorAll(".tab-pane");
        var curr,item;
        for(item of staff) {
            name=item.querySelector("h3") || item.querySelector("h2");
            title=item.querySelector("h5") || item.querySelector("h4");
            email=item.querySelector("span.__cf_email__");
            phone=item?item.innerText.match(phone_re):"";
            //console.log("name="+name+",title="+title+",email="+email+",phone="+phone);
            curr={name:name?name.innerText.trim():"",title:title?title.innerText.trim():"",
                  email:email&&email.dataset.cfemail?MTP.cfDecodeEmail(email.dataset.cfemail):"",
                  phone:phone?phone[0]:""};
            console.log(curr);
            if(curr.name && curr.title) {
                my_query.staff_list.push(new Person(curr,"","",get_quality(curr)));
            }

        }
        if(my_query.staff_list.length>0) {
            assign_owner(my_query.staff_list);
        }
        else {
            if(!my_query.fields.fh_email) {
                console.log("my_query.fields.fh_email="+my_query.fields.fh_email);
                my_query.fields.fh_email="Not Found";
            }
            if(my_query.fields.owner_first_name==="") my_query.fields.owner_first_name=my_query.fields.owner_last_name="Not Found";
            var query={dept_regex_lst:[/Staff/,/Team/],title_regex_lst:[/Owner/,/Manager/,/Director/]};

            let promise=MTP.create_promise(url,Gov.init_Gov,resolve,reject,query);
            return;
        }

        resolve("batesville");
    }

    function parse_dignity(doc,url,resolve,reject) {
        console.log("setting dignity,url="+url);
        my_query.checkboxes['fh_provider']='sci_dignity_memorial';
        my_query.fields.fh_email='Not Found';
        var assoc=doc.querySelectorAll('#associates li');
        console.log("assoc="+assoc);
        if(assoc.length>0) {
            console.log("assoc[0]="+assoc[0]);
            let name_elem=assoc[0].querySelector("h3"),title_elem=assoc[0].querySelector("span");
            let name=MTP.parse_name(name_elem.innerText.trim());
            console.log("name="+JSON.stringify(name));
            if(name&&name.fname) {
                my_query.fields.owner_first_name=name.fname;
                my_query.fields.owner_last_name=name.lname;
                my_query.fields.owner_title=title_elem.innerText.trim();
            }

        }
        else if(!my_query.fields.owner_first_name) {
            console.log("No assoc");
            console.log(doc);
            my_query.fields.owner_first_name=my_query.fields.owner_last_name="Not Found";
        }
        resolve("dignity");
    }
    function parse_home_then(result) {
         console.log(Gov.contact_list);
        console.log(Gov.email_list);
                    console.log("result="+result);

        if(result===undefined || /^MOOOO/.test(result)) {
            console.log(my_query.fields);
            if(my_query.checkboxes.fh_provider===undefined||my_query.checkboxes.fh_provider==='')
            {
                my_query.checkboxes.fh_provider="other";
                my_query.fields.fh_provider_other="None";
            }
            var new_contact_list=Gov.contact_list.map(item => { item.quality=get_quality(item); return item; });
            if(new_contact_list.length>0&&new_contact_list[0].quality>0) {
                new_contact_list.sort(comparequal);
                console.log(new_contact_list);
                let parsed=MTP.parse_name(new_contact_list[0].name);
                my_query.fields.owner_first_name=parsed.fname;
                my_query.fields.owner_last_name=parsed.lname;
                my_query.fields.owner_title=new_contact_list[0].title;
                my_query.fields.owner_phone=new_contact_list[0].phone;

                my_query.fields.owner_email=new_contact_list[0].email?new_contact_list[0].email.replace(/(@.*(\.com|\.org))[A-Z]+.*$/,"$1"):"";
            }
            else if(!my_query.fields.owner_first_name) my_query.fields.owner_first_name=my_query.fields.owner_last_name="Not Found";
            
            if(Gov.email_list.length===0&&!my_query.fields.fh_email) my_query.fields.fh_email="Not Found";
            else if(Gov.email_list.length>0) my_query.fields.fh_email=Gov.email_list[0].email;
            //government
                        console.log(my_query.fields);

        }
        my_query.done.query=true;
        submit_if_done();
    }

    function begin_script(timeout,total_time,callback) {
        if(timeout===undefined) timeout=200;
        if(total_time===undefined) total_time=0; 
        if(callback===undefined) callback=init_Query;
        if(MTurk!==undefined) { callback(); }
        else if(total_time<2000) {
            console.log("total_time="+total_time);
            total_time+=timeout;
            setTimeout(function() { begin_script(timeout,total_time,callback); },timeout);
            return;
        }
        else { console.log("Failed to begin script"); }
    }

    function add_to_sheet() {
        var x,field;
        my_query.fields.fh_email=my_query.fields.fh_email.replace(/(@.*(\.com|\.org))[A-Z]+.*$/,"$1");
        my_query.fields.phone=my_query.fields.phone.replace(/^1/,"").replace(/[^\d]/g,"");
        my_query.fields.phone=my_query.fields.phone.substr(0,3)+"-"+my_query.fields.phone.substr(3,3)+'-'+my_query.fields.phone.substr(6,4);
          for(x in my_query.checkboxes) {
            var query_str="crowd-checkbox[name='"+x+"'][value='"+my_query.checkboxes[x]+"']";
            //console.log("query_str="+query_str);
            var elem=document.querySelector(query_str);
            //console.log("elem="+elem.outerHTML);
            if(elem&&!elem.checked) elem.click();
        }
        for(x in my_query.fields) {
            if((MTurk.is_crowd && (field=document.getElementsByName(x)[0])) ||
               (!MTurk.is_crowd && (field=document.getElementById(x)))) field.value=my_query.fields[x];
        }

    }

    function submit_if_done() {
        var is_done=true,x,is_done_dones=true;

        add_to_sheet();
        console.log("my_query.done="+JSON.stringify(my_query.done));
        for(x in my_query.done) if(!my_query.done[x]) is_done_dones=false;
        is_done=is_done_dones;

        if((my_query.fields.fh_email==="Not Found" || !my_query.fields.fh_email) && (!my_query.fields.owner_first_name||!my_query.fields.owner_title)) is_done=false;
        if(!my_query.fields.city_state_zip) is_done=false;
        if(is_done && !my_query.submitted && (my_query.submitted=true)) {
            if(!my_query.fields.fh_email) { my_query.fields.fh_email="Not Found";
            add_to_sheet(); }
            console.log(my_query.fields);
            MTurk.check_and_submit();
        }
        else if(is_done_dones) {
            console.log("Returning hit");
            GM_setValue("returnHit",true);
        }
    }

    function init_Query()
    {
        bad_urls=bad_urls.concat(default_bad_urls);
        var submitThing=document.querySelector(".submit-button-container");
        var previous=document.querySelector(".footer");
        submitThing.parentNode.insertBefore(submitThing, previous);

        console.log("in init_query");
        var i;
        var querydata=document.querySelectorAll(".span-add");
        var re1=/^(.*) in (.*), (.*)$/,match_query;
        match_query=querydata[1].innerText.trim().match(re1);
        if(!match_query) match_query=querydata[1].innerText.trim().match(/^(.*) in/);
        console.log(match_query);
        console.log(querydata);
        var street = querydata.length>2 ? querydata[2].innerText.trim() : "";
        var phone= querydata.length>4 ? querydata[4].innerText.trim() : "";
        my_query={name:match_query[1],city:match_query.length>2?match_query[2]:"", state:match_query.length>3?match_query[3]:"",street:street,phone:phone,

                  fields:{fh_email:"",phone:phone,owner_first_name:'',address:street},checkboxes:{fh_provider:''},
                  done:{"query":false,"bbb":false,"buzzfile":false,"fb":false},fb_url:"",
		  try_count:{"query":0,"bbb":0}, staff_list:[],
		  submitted:false};
	console.log("my_query="+JSON.stringify(my_query));
        var search_str=my_query.name+" "+my_query.city+" "+my_query.state;
        const queryPromise = new Promise((resolve, reject) => {
            console.log("Beginning URL search");
            query_search(search_str, resolve, reject, query_response,"query");
        });
        queryPromise.then(query_promise_then)
            .catch(function(val) {
            console.log("Failed at this queryPromise " + val);
            if(my_query.checkboxes.fh_provider==='') {
                my_query.checkboxes.fh_provider="other";
                my_query.fields.fh_provider_other="None";
            }

            if(!my_query.fields.fh_email) my_query.fields.fh_email="Not Found";
            if(my_query.fields.website_url===undefined) my_query.fields.website_url="www.Not Found";
            if(my_query.fields.owner_first_name==="") my_query.fields.owner_first_name=my_query.fields.owner_last_name="Not Found";


            my_query.done.query=true;
            submit_if_done();

        });

        const bbbPromise = new Promise((resolve, reject) => {
            console.log("Beginning URL search");
            query_search(my_query.name+" "+my_query.city+" "+my_query.state+" site:bbb.org",resolve,reject,query_response,"bbb");
        });
        bbbPromise.then(bbb_promise_then)
            .catch(function(val) {
            console.log("Failed at this bbbPromise " + val);

            my_query.done.bbb=true;
            submit_if_done();
      //  GM_setValue("returnHit"+MTurk.assignment_id,true);

        });

        const buzzfilePromise = new Promise((resolve, reject) => {
            console.log("Beginning URL search");
            query_search(my_query.name+" "+my_query.city+" "+my_query.state+" site:buzzfile.com",resolve,reject,query_response,"buzzfile");
        });
        buzzfilePromise.then(buzzfile_promise_then)
            .catch(function(val) {
            console.log("Failed at this buzzfilePromise " + val);

            my_query.done.buzzfile=true;
            submit_if_done();
      //  GM_setValue("returnHit"+MTurk.assignment_id,true);

        });
        const fbPromise = new Promise((resolve, reject) => {
            console.log("Beginning URL search");
            query_search(my_query.name+" "+my_query.city+" "+my_query.state+" site:facebook.com",resolve,reject,query_response,"fb");
        });
        fbPromise.then(fb_promise_then)
            .catch(function(val) {
            console.log("Failed at this fbPromise " + val);

            my_query.done.fb=true;
            submit_if_done();
      //  GM_setValue("returnHit"+MTurk.assignment_id,true);

        });
    }

})();