var query = window.location.search;
var movie_id = query.split('=')[1];
var movie_id = query.split('=')[1];
console.log(movie_id);

var movie_name = document.getElementById('movie_name');
var poster = document.getElementById('poster');
var year = document.getElementById('year_of_release');
var desc = document.getElementById('description');
var cast = document.getElementById('cast');
var dir = document.getElementById('director');

var response;
var directors=[];

var request1 = new XMLHttpRequest();
request1.onreadystatechange = function(){
	if(request1.readyState === XMLHttpRequest.DONE){
		console.log('DONE '+request1.status);
		if(request1.status===200){
			console.log('Received ----> '+this.responseText);
			var response = JSON.parse(this.responseText);
			movie_name.innerHTML = response["name"];
			poster.src = response["posterpath"];
			year.innerHTML = response["release"];
			desc.innerHTML = response["overview"];
			cast.innerHTML=response["cast"];
			dir.innerHTML = response["director"];
		}
		else
		console.log("Error");
	}
};

request1.open('GET','/get-movie-details?movieid='+movie_id);
request1.send('{}');


var submit = document.getElementById('submit_btn');
submit.onclick = function(){
	
	var request = new XMLHttpRequest();


	request.onreadystatechange = function(){

		if(request.readyState === XMLHttpRequest.DONE){
			if(request.status === 200){
				response = JSON.parse(this.responseText);
				console.log('Review Submitted');
				window.location.href=response.redirect;
			}
		}
	};

	var review = document.getElementById('review').value;
	console.log('POST ---> '+review);
	request.open('POST','/submit-review',true);
	request.setRequestHeader('Content-Type', 'application/json');
	var reviewObj = {
						reviewcon: review,
	 				 	movieid: movie_id
	 				};
	request.send(JSON.stringify(reviewObj));



};
