var rec_list = document.getElementById('list_reviews');

var request = new XMLHttpRequest();
request.onreadystatechange = function(){
	if(request.readyState === XMLHttpRequest.DONE){
		console.log('DONE '+request.status);
		if(request.status===200){
			console.log('Received ----> '+this.responseText);
			response = JSON.parse(this.responseText);
			var results = ' ';
			for (var i = 0; i < response.length; i++) {
				results += '<li><a href="/review?id='+response[i].reviewid+'"> <div class="col-sm-1"> <img src = "'+response[i].logo+'"></div>';
				results += '<div class="col-sm-11">';
				results += response[i].username+' wrote a review on '+response[i].moviename;
				results += '<br>on&nbsp;'+response[i].date+'</div></a></li>';
			}
			//results += '</ul>';
			rec_list.innerHTML = results;
		}
		else
			console.log("Error!");
	}
};
console.log('Getting recent...');
request.open('GET','/get-recent');
request.send('{}');