/* 
 contains all of the code related to the addition of elements
 and a lot of other fancy features
 
 TODO: go through and clean up the other main.js code so we can merge stuff
*/

import entityList from './data/entities.json';
import brushList from './data/brushes.json';
import enemyList from './data/enemies.json';
import nameList from './data/names.json';

const createObjBtn = (objIdx, imgLoc = "") => {
	let button = document.createElement("div")
	button.className = "uk-button"
	
	let img = document.createElement("img")
	img.onerror = function() {this.src = "assets/images/icons/icon-warn.png";}
	img.src = `assets/images/${imgLoc}${objIdx}.png`
	
	img.style.maxHeight = "64px"
	img.style.verticalAlign = "middle"
	
	let label = document.createElement("label")
	label.innerText = nameList[objIdx]
	
	button.appendChild(img)
	button.innerHTML += "<br>"
	button.appendChild(label)
	
	button.addEventListener('click', () => {
		try {
			test()
		} catch(ex) {
			console.log("Unable to call functions from main.js")
		}
	})
	
	return button
}

const UpdateEntityList = () => {
	let ListE = document.getElementById("entitylist")
	for (var idx in entityList) {
		var ent = entityList[ idx ]
		ListE.appendChild(createObjBtn(ent, "props/"))
	}
}

const UpdateBrushList = () => {
	let ListE = document.getElementById("brushlist")
	for (var idx in brushList) {
		var brush = brushList[ idx ]
		ListE.appendChild(createObjBtn(brush, "brushes/"))
	}
}

const UpdateEnemyList = () => {
	let ListE = document.getElementById("enemylist")
	for (var idx in enemyList) {
		var enemy = enemyList[ idx ]
		ListE.appendChild(createObjBtn(enemy, "enemies/"))
	}
}

document.getElementById("propTab").addEventListener('click', () => {
	document.getElementById("enemylist").style.display = 'none';
	document.getElementById("brushlist").style.display = 'none';
	document.getElementById("entitylist").style.display = 'grid';
})

document.getElementById("enemyTab").addEventListener('click', () => {
	document.getElementById("enemylist").style.display = 'grid';
	document.getElementById("brushlist").style.display = 'none';
	document.getElementById("entitylist").style.display = 'none';
})

document.getElementById("brushTab").addEventListener('click', () => {
	document.getElementById("enemylist").style.display = 'none';
	document.getElementById("brushlist").style.display = 'grid';
	document.getElementById("entitylist").style.display = 'none';
})

UpdateEntityList()
UpdateBrushList()
UpdateEnemyList()