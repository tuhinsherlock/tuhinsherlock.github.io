    var register = document.getElementById('register_btn');

    register.onclick = function () {
        // Create a request object
        var request = new XMLHttpRequest();
        
        // Capture the response and store it in a variable
        request.onreadystatechange = function () {
          if (request.readyState === XMLHttpRequest.DONE) {
              // Take some action
              if (request.status === 200) {
                  register.value = 'Registered!';
                  window.location.href="/";
              } else {
                  alert('Could not register the user');
                  register.value = 'Register';
              }
          }
        };
        
        // Make the request
        var username = document.getElementById('username');
        var password = document.getElementById('password');
        var name = document.getElementById('name');
        var email = document.getElementById('email');
      

        var unamev = username.value;
        var passv = password.value;
        var namev = name.value;
        var emailv = email.value;

        if(unamev.length===0){
          username.placeholder= "Username is required";
          username.className += " formInvalid";
        }
        if(passv.length===0){
          password.placeholder="Password is required";
          password.className += " formInvalid";
        }
        if(namev.length===0){
          name.placeholder= "Name is required";
          name.className += " formInvalid";
        }
        if(emailv.length===0){
          email.placeholder= "Email is required";
          email.className += " formInvalid";
        }

        if(unamev && passv && namev && emailv)
        {
          request.open('POST', '/create-user');
          request.setRequestHeader('Content-Type', 'application/json');
          request.send(JSON.stringify({username: unamev, password: passv, name:namev, email:emailv}));  
          register.value = 'Registering...';
      }
    
    };