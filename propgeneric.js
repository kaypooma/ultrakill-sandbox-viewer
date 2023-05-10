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

  constructor( propData, options, block ) {
    this.geometry = options.geometry;

    // material setup
		let mat = materials[ propData.ObjectIdentifier ];
		if (mat != null) {
		  mat.color = Number(mat.color);
	  } else {
	    Log_Prop.Warn(`No material found for ${propData.ObjectIdentifier}. Object may not appear correctly.`);
    }

    this.solidMaterial = new THREE.MeshLambertMaterial( mat ) || new THREE.MeshLambertMaterial({ color: 0xff00ff });
    this.frameMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.4 });

    // mesh setup
    this.solidMesh = new THREE.Mesh( this.geometry, this.solidMaterial );
    this.frameMesh = new THREE.Mesh( this.geometry, this.frameMaterial );

    // scale group
    this.scaleGroup.add( this.solidMesh );
    this.scaleGroup.add( this.frameMesh );

    if (block) {
      this.scaleGroup.scale.set( propData.BlockSize.x, propData.BlockSize.y, propData.BlockSize.z );
    } else {
      this.scaleGroup.scale.set( propData.Scale.x, propData.Scale.y, propData.Scale.z );
    }

    // position/rotation group
    this.positionGroup.add( this.scaleGroup )

    this.positionGroup.position.set( -propData.Position.x, propData.Position.y, propData.Position.z );
    this.positionGroup.rotation.copy( MathEx.fromUnityQuaternion( propData.Rotation.x, propData.Rotation.y, propData.Rotation.z, propData.Rotation.w ) );

    // userdata setup
    this.solidMesh.userData.objectData = propData;
    this.solidMesh.userData.objectType = block ? 'block' : 'prop';
    this.solidMesh.userData.parentGroup = this.positionGroup;
    this.solidMesh.userData.scaleGroup = this.scaleGroup;
    this.solidMesh.userData.drawFunc = options.drawFunc;
  }
}

export default PropGeneric;
