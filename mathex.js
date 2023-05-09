import * as THREE from 'three';

const MathEx = class MathEx {
  static toDegrees(rad) {
    return rad * 180/Math.PI;
  }

  static toRadians(rad) {
    return rad * Math.PI/180;
  }

  // unity quaternion ->       x, y, z,  w
  // to threejs quaternion -> -x, y, z, -w
  // to euler
  // 

  static fromUnityQuaternion( x, y, z, w ) {
    let quaternion = new THREE.Quaternion( -x, y, z, -w );

    let euler = new THREE.Euler();

    euler.setFromQuaternion( quaternion );
    euler.y += Math.PI;
    euler.z *= -1;

    return euler;
  }

  static toUnityQuaternion( x, y, z ) {
    let euler = new THREE.Euler( x, y, z );

    euler.y -= Math.PI;
    euler.z *= -1;

    let quaternion = new THREE.Quaternion().setFromEuler( euler );

    quaternion.x *= -1;
    quaternion.w *= -1;

    return quaternion;
  }
}

export { MathEx };
