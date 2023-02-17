'use strict';

const themeButton = document.querySelector('.theme');

themeButton.addEventListener('click', function() {
	document.body.classList.toggle('light-theme');
	document.body.classList.toggle('dark-theme');
	
	const className = document.body.className;
	if(className == "light-theme") {
		this.textContent = "Dark";
	} else {
		this.textContent = "Light";
    }
});

function selectMod(evt, mod) {
	var i, tabContent, tabLinks;
	tabContent = document.getElementsByClassName("selectedmod");
	for(i = 0; i < tabContent.length; i++) {
		tabContent[i].style.display = "none";
	}
	tabLinks = document.getElementsByClassName("tablinks");
	for(i = 0; i < tabLinks.length; i++) {
		tabLinks[i].className = tabLinks[i].className.replace(" active", "");
	}
	document.getElementById(mod).style.display = "block";
	evt.currentTarget.className += " active";
}

document.getElementById("defaultMod").click();