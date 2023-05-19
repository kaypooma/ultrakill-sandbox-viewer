import * as THREE from 'three';
import MathEx from './mathex';
import Logger from './logger';

import materials from './data/materials.json';

const Log_Prop = new Logger("Prop");

const PropGeneric = class PropGeneric {
  geometry;

  solidMaterial;
  frameMaterial;

  solidMesh;
  frameMesh;

  scaleGroup = new THREE.Group();
  positionGroup = new THREE.Group();

  constructor( prop, options, block ) {
    this.geometry = options.geometry;

    // material setup
		let mat = materials[ prop.id ];
		if (mat != null) {
		  mat.color = Number(mat.color);
	  } else {
	    Log_Prop.Warn(`No material found for ${prop.id}. Object may not appear correctly.`);
    }

    this.solidMaterial = new THREE.MeshLambertMaterial( mat ) || new THREE.MeshLambertMaterial({ color: 0xff00ff });
    this.frameMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.4 });

    // mesh setup
    this.solidMesh = new THREE.Mesh( this.geometry, this.solidMaterial );
    this.frameMesh = new THREE.Mesh( this.geometry, this.frameMaterial );

    // scale group
    this.scaleGroup.add( this.solidMesh );
    this.scaleGroup.add( this.frameMesh );

    this.scaleGroup.scale.set( prop.scale.x, prop.scale.y, prop.scale.z );

    // position/rotation group
    this.positionGroup.add( this.scaleGroup )

    this.positionGroup.position.set( -prop.position.x, prop.position.y, prop.position.z );
    this.positionGroup.rotation.copy( MathEx.fromUnityQuaternion( prop.rotation.x, prop.rotation.y, prop.rotation.z, prop.rotation.w ) );

    // userdata setup
    this.solidMesh.userData.objectData = prop;
    this.solidMesh.userData.objectType = block ? 'block' : 'prop';
    this.solidMesh.userData.parentGroup = this.positionGroup;
    this.solidMesh.userData.scaleGroup = this.scaleGroup;
    this.solidMesh.userData.drawFunc = options.drawFunc;
  }
}

export default PropGeneric;
