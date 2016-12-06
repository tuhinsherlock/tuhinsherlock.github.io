var query = window.location.search;
var review_id = query.split('=')[1];
console.log(review_id);

var htmltitle = document.getElementById('review_title')
var movie_name = document.getElementById('movie_name');
var poster = document.getElementById('poster');
var year = document.getElementById('year_of_release');
var desc = document.getElementById('description');
var username= document.getElementById('username');
var date = document.getElementById('date');
var review = document.getElementById('review');
var director=document.getElementById('director');
var cast=document.getElementById('cast');

var writerevbutton = document.getElementById('writerevbutton');

var response;

function loadstuff(uname){
	var request = new XMLHttpRequest();
	request.onreadystatechange = function(){
		if(request.readyState === XMLHttpRequest.DONE){
			console.log('DONE '+request.status);
			if(request.status===200){
				console.log('Received ----> '+this.responseText);
				response = JSON.parse(this.responseText);
				movie_name.innerHTML = response["moviename"];
				poster.src = response["posterpath"];
				year.innerHTML = response["release"];
				cast.innerHTML=response["cast"];
				director.innerHTML=response["director"];
				username.innerHTML = '<a href="/users/'+response["username"]+'">'+response["username"]+'</a>';
				date.innerHTML = response["date"];
				review.innerHTML = response["review"];

				htmltitle.innerHTML = response.username+' on '+response.moviename+' | CineHub';
				
				writerevbutton.onclick = function(){
					console.log('Setting Link');
					if(uname)
						window.location.href = '/write-review?movieid='+response.movieid;
					else
						window.location.href = '/';
				};
			}
			else
				console.log("Error");
		}
	};
	console.log('Review.js Review id: ' +review_id);
	request.open('GET','/get-review-details?id='+review_id);
	request.send('{}');
}

var userlink = document.getElementById('userlink');
var tabbar_username = document.getElementById('tabbar_username');

console.log('ready');
function loadLogin () {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState === XMLHttpRequest.DONE) {

            if (request.status === 200) {
            	userlink.href = '/users/'+this.responseText;
            	tabbar_username.innerHTML = this.responseText;
            	loadstuff(this.responseText);
            } else {
                userlink.href = '/';
                tabbar_username.innerHTML = 'LOG IN or SIGN UP';
                loadstuff('');
            }
        }
    };
    request.open('GET', '/check-login', true);
    request.send(null);
}

loadLogin();