
var a = window.location.pathname.split('/');
var usernameurl = a[a.length-1];

var total_reviews = document.getElementById('total_reviews');
var joined = document.getElementById('joined');
var uname = document.getElementById('uname');
//name.innerHTML = 'Kubo';
var username= document.getElementById('username');
var reviews= document.getElementById('reviews');

var response;

var request = new XMLHttpRequest();
request.onreadystatechange = function(){
	if(request.readyState === XMLHttpRequest.DONE){
		console.log('DONE '+request.status);
		if(request.status===200){
			console.log('Received ----> '+this.responseText);
			response = JSON.parse(this.responseText);

			username.innerHTML = usernameurl;
			uname.innerHTML = response["name"];
			console.log('received name = '+response["name"]);
			joined.innerHTML = response["datejoined"];
			total_reviews.innerHTML = response["totalreviews"];
			var userreviews = response.userreviews;
			var results = ' ';
			for (var i = 0; i < userreviews.length; i++) {
				results += '<li><a href="/review?id='+userreviews[i].contentid+'">';
				results += '<img src="'+userreviews[i].logo+'">';
				results += '&emsp;&emsp;&emsp;'+userreviews[i].moviename;
				results += '<br> Written on: '+userreviews[i].date;
				results += '</a> </li>';
			}
			//results += '</ul>';
			reviews.innerHTML = results;
		}
		else
		console.log("Error");
	}
};
console.log('User.js Username: ' +usernameurl);
request.open('GET','/get-user-details?username='+usernameurl);
request.send('{}');