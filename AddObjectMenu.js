import props from './data/props.json';
import brushes from './data/brushes.json';
import enemies from './data/enemies.json';
import names from './data/names.json';
import { Logger } from './logger.js';

const Log_AOM = new Logger("AddObjectMenu");

const AddObjectMenu = class AddObjectMenu {
	tabs;
	addCallbacks = {
	  'props': null,
	  'brushes': null,
	  'enemies': null,
	};

	constructor(id) {

		this.tabs = {
			'props': document.getElementById("proplist"),
			'brushes': document.getElementById("brushlist"),
			'enemies': document.getElementById("enemylist"),
		};

		document.getElementById("propTab").addEventListener('click', () => {
      this.changeTab("props");
		});

    document.getElementById("enemyTab").addEventListener('click', () => {
      this.changeTab("enemies");
		});

    document.getElementById("brushTab").addEventListener('click', () => {
      this.changeTab("brushes");
		});

	}

	createObjBtn(objIdx, imgLoc = "") {
	  let button = document.createElement("div");
	  button.className = "uk-button";
	  button.id = objIdx;
	
	  let img = document.createElement("img");
	  img.onerror = function() {
	    this.src = "assets/images/icons/icon-warn.png";
	  };
	  img.src = `assets/images/${imgLoc}/${objIdx}.png`;
	
	  img.style.maxHeight = "64px";
	  img.style.verticalAlign = "middle";
	
	  let label = document.createElement("label");
	  label.innerText = names[objIdx];
	
	  button.appendChild(img);
	  button.appendChild(label);
	
	  button.addEventListener('click', () => {
		try {
		  	this.addCallbacks[imgLoc](objIdx);
		  } catch(ex) {
		  	Log_AOM.Error(`Unable to add item ${objIdx}`);
	  	}
  	});
	
  	return button
  }

	updateLists() {
    // prop list
    for (var idx in props) {
      var prop = props[idx];

      this.tabs['props'].appendChild(this.createObjBtn(prop, "props"));
    }

    // brush list
    for (var idx in brushes) {
      var brush = brushes[idx];

      this.tabs['brushes'].appendChild(this.createObjBtn(brush, "brushes"));
    }

    // enemy list
	  for (var idx in enemies) {
      var enemy = enemies[idx];

      this.tabs['enemies'].appendChild(this.createObjBtn(enemy, "enemies"));
    }
	}

	changeTab(tabId) {
		for (var idx in this.tabs) {
			let element = this.tabs[idx]

			if (idx == tabId) {
				element.style.display = 'grid'
			} else {
				element.style.display = 'none'
			}
		}
	}

}

export { AddObjectMenu };
