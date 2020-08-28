// ==UserScript==
// @name         Howie ChanScrapeContacts
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  New script
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
// @require https://raw.githubusercontent.com/jacobmas/MTurkScripts/master/js/MTurkScript.js
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
    var bad_urls=[];
    /* TODO should be requester #, last field should be if it's crowd or not */
    var MTurk=new MTurkScript(45000,750+(Math.random()*1000),[],begin_script,"A2JX5V2BSHLRQ5",true);
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
	    if(b_context&&(parsed_context=MTP.parse_b_context(b_context))) {
                console.log("parsed_context="+JSON.stringify(parsed_context)); }
            if(lgb_info&&(parsed_lgb=MTP.parse_lgb_info(lgb_info))) {
                    console.log("parsed_lgb="+JSON.stringify(parsed_lgb)); }
            for(i=0; i < b_algo.length; i++) {
                b_name=b_algo[i].getElementsByTagName("a")[0].textContent;
                b_url=b_algo[i].getElementsByTagName("a")[0].href;
                b_caption=b_algo[i].getElementsByClassName("b_caption");
                p_caption=(b_caption.length>0 && b_caption[0].getElementsByTagName("p").length>0) ?
                    p_caption=b_caption[0].getElementsByTagName("p")[0].innerText : '';
                console.log("("+i+"), b_name="+b_name+", b_url="+b_url+", p_caption="+p_caption);
                if(!MTurkScript.prototype.is_bad_url(b_url, bad_urls) && !MTurkScript.prototype.is_bad_name(b_name,my_query.name,p_caption,i)
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
    }

    function set_quality() {
        var curr;
        var bad=/(^| )(Rd|Main|Office)($| )/i;
        for(curr of Gov.contact_list) {
            curr.quality=0;
            if(curr.email===undefined || curr.email==="") curr.email="n/a";
            if(curr.phone===undefined || curr.phone==="") {
                if(Gov.phone!=="") curr.phone=Gov.phone;
                else curr.phone="n/a";
            }
            var nlpstuff=nlp(curr.name).people().json();
            console.log("nlpstuff=");
            console.log(nlpstuff);
            if(nlp(curr.name).people().json().length>0) {
                curr.quality+=20;
            }
            if(/President|CEO|Chief Executive|CFO|CIO/i.test(curr.title)) {
                curr.quality+=5;
            }
            if(/Director|Administrator/i.test(curr.title)) {
                curr.quality+=3;
            }
            if(/Secretary|Treasurer/i.test(curr.title)) {
               curr.quality+=1; }
            if(curr.email!==undefined && curr.email!="n/a") {
                curr.quality+=10;
            }
            console.log("check");
            if(bad.test(curr.name)) {
                curr.quality=0;
            }
            if(/Directory/.test(curr.title)) {
                curr.quality=0; }
            if(curr.phone!="n/a") {
                curr.quality+=1; }
            if(curr.email==="n/a") {
                curr.quality=0;
            }

        }
    }
      function begin_script(timeout,total_time,callback) {
        if(timeout===undefined) timeout=400;
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
        for(x in my_query.fields) {
            if((MTurk.is_crowd && (field=document.getElementsByName(x)[0])) ||
               (!MTurk.is_crowd && (field=document.getElementById(x)))) field.value=my_query.fields[x];
        }
    }

    function submit_if_done() {
        var is_done=true,x;
        add_to_sheet();
        for(x in my_query.done) if(!my_query.done[x]) is_done=false;
        if(is_done && !my_query.submitted && (my_query.submitted=true)) MTurk.check_and_submit();
    }

    function gov_promise_then(result) {
        set_quality();
        Gov.contact_list.sort(function(a,b) { return b.quality-a.quality; });

        console.log("Gov.contact_list="+JSON.stringify(Gov.contact_list));
        if(Gov.contact_list.length===0 || Gov.contact_list[0].quality<=0) {
            console.log("No good contacts, returning");
            GM_setValue("returnHit"+MTurk.assignment_id,true);
            return;
        }
        var i;
        for(i=0;i<3&&i<Gov.contact_list.length;i++) {
            if(Gov.contact_list[i].quality<=0) break;
            my_query.fields["name"+(i+1)]=Gov.contact_list[i].name;
            my_query.fields["title"+(i+1)]=Gov.contact_list[i].title;
            my_query.fields["email"+(i+1)]=Gov.contact_list[i].email;
            my_query.fields["phone"+(i+1)]=Gov.contact_list[i].phone;

        }
        console.log("my_query.fields="+JSON.stringify(my_query.fields));
        submit_if_done();


    }


    function init_Query()
    {
        console.log("in init_query");
        var i;
        var url=document.querySelector("form a").href;
                my_query={"fields":{},
                url:url};
        for(i=1;i<=3;i++) {
            my_query["name"+i]=my_query["title"+i]=my_query["email"+i]=my_query["phone"+i]="";
        }

        var dept_regex_lst=[/Leadership/,/^Board /,/Board Members/,/^Members($| )/];

        var title_regex_lst=[/Admin|Administrator|Supervisor|Manager|Director|Founder|Owner|Officer|Secretary|Assistant/i,/Director/i];
        var query={dept_regex_lst:dept_regex_lst,
                       title_regex_lst:title_regex_lst,id_only:false,default_scrape:false,debug:false};
        var gov_promise=MTP.create_promise(my_query.url,Gov.init_Gov,gov_promise_then,function(result) {
            console.log("Failed at Gov "+result);
            my_query.fields["name1"]=my_query.fields["title1"]="broken";
            my_query.fields["email1"]="na@na.com";
            my_query.fields["phone1"]="n/a";
            submit_if_done();
        },query);
    }

})();