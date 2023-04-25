import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

import CameraControls from 'camera-controls';

import { SandboxManager } from './sandman';
import { defaultSceneData } from './defaultscene';

CameraControls.install({ THREE: THREE })

const Sandbox = new SandboxManager()
const Prefs = { 
    moveSpeed: 10, moveSpeedMult: 10,
    getMoveSpeed: () => { return Prefs.moveSpeed*(KeyPressed.ShiftLeft ? Prefs.moveSpeedMult : 1) },
}
const EditingObject = {
    hovered: false,
    selected: false
}
const AxisDisplay = {}

let sandboxFilename

// file stuff
const fileElement = document.getElementById('sandbox_file')

const handleSandboxFile = () => {
    let files = fileElement.files

    if (files[0]) {
        let reader = new FileReader()
        reader.onload = (e) => {
            Sandbox.loadMap( JSON.parse(e.target.result) )
            reloadScene(scene)
        }

        reader.readAsText(files[0])
        sandboxFilename = files[0].name
    }
}

fileElement.addEventListener('change', handleSandboxFile, false)


// 3d stuff
let scene, camera, renderer
let controls

const clock = new THREE.Clock()

// unity quaternion ->       x, y, z,  w
// to threejs quaternion -> -x, y, z, -w
// to euler
// 

const convertFromUnityQuaternion = ( x, y, z, w ) => {
    let quaternion = new THREE.Quaternion( -x, y, z, -w )

    let v = new THREE.Euler()

    v.setFromQuaternion( quaternion )
    v.y += Math.PI
    v.z *= -1

    return v
}
const convertToUnityQuaternion = ( x, y, z ) => {
    let euler = new THREE.Euler( x, y, z )

    euler.y -= Math.PI
    euler.z *= -1

    let quaternion = new THREE.Quaternion().setFromEuler( euler )

    quaternion.x *= -1
    quaternion.w *= -1

    return quaternion
}

const objectMaterials = {
    'ultrakill.brush-plastic': { color: 0xC8C3AB },
    'ultrakill.brush-metal': { color: 0x56544A },
    'ultrakill.brush-wood': { color: 0xAC8E65 },
    'ultrakill.brush-grass': { color: 0x708835 },
    'ultrakill.brush-glass': { color: 0xB3B1A8, transparent: true, opacity: 0.7 },
    'ultrakill.brush-water': { color: 0x76AAB4, transparent: true, opacity: 0.7 },
    'ultrakill.brush-hot-sand': { color: 0xECA33A },
    'ultrakill.brush-lava': { color: 0xFFFF0E, transparent: true, opacity: 0.7 },
    'ultrakill.brush-acid': { color: 0xD59B15, transparent: true, opacity: 0.7 },

    'ultrakill.ramp': { color: 0x877057 },
    'ultrakill.ramp-stone': { color: 0x838179 },

    'ultrakill.barrel': { color: 0x995D36 },
    'ultrakill.explosive-barrel': { color: 0xFF2126 },

    'ultrakill.barrier': { color: 0xC8C3AB },
    
    'ultrakill.tree': { color: 0x6A652B },

    'ultrakill.melon': { color: 0x67A54C },
}

const PropGeneric = class PropGeneric {
    geometry

    solidMaterial
    frameMaterial

    solidMesh
    frameMesh

    scaleGroup = new THREE.Group()
    positionGroup = new THREE.Group()

    constructor( propData, options, block ) {
        this.geometry = options.geometry
        
        // material setup
        this.solidMaterial = new THREE.MeshLambertMaterial( objectMaterials[ propData.ObjectIdentifier ] ) || new THREE.MeshLambertMaterial({ color: 0xff00ff })
        this.frameMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.4 })

        // mesh setup
        this.solidMesh = new THREE.Mesh( this.geometry, this.solidMaterial )
        this.frameMesh = new THREE.Mesh( this.geometry, this.frameMaterial )

        // scale group
        this.scaleGroup.add( this.solidMesh )
        this.scaleGroup.add( this.frameMesh )

        if (block) {
            this.scaleGroup.scale.set( propData.BlockSize.x, propData.BlockSize.y, propData.BlockSize.z )
        } else {
            this.scaleGroup.scale.set( propData.Scale.x, propData.Scale.y, propData.Scale.z )            
        }

        // position/rotation group
        this.positionGroup.add( this.scaleGroup )
        
        this.positionGroup.position.set( -propData.Position.x, propData.Position.y, propData.Position.z )
        this.positionGroup.rotation.copy( convertFromUnityQuaternion( propData.Rotation.x, propData.Rotation.y, propData.Rotation.z, propData.Rotation.w ) )

        // userdata setup
        this.solidMesh.userData.objectData = propData
        this.solidMesh.userData.objectType = block ? 'block' : 'prop'
        this.solidMesh.userData.parentGroup = this.positionGroup
        this.solidMesh.userData.scaleGroup = this.scaleGroup
        this.solidMesh.userData.drawFunc = options.drawFunc
    }
}

const addBlock = ( scene, blockData ) => {
    let block = new PropGeneric( blockData, {
        geometry: new THREE.BoxGeometry(1, 1, 1),
        drawFunc: addBlock
    }, true)

    for ( let mesh of [ block.solidMesh, block.frameMesh ] ) {
        mesh.position.set(0.5, 0.5, -0.5)
    }

    scene.add( block.positionGroup )
    return block.solidMesh    
}
// const addBlock = ( scene, blockData ) => {
//     let geometry = new THREE.BoxGeometry( blockData.BlockSize.x, blockData.BlockSize.y, blockData.BlockSize.z )

//     let solid = new THREE.MeshLambertMaterial( objectMaterials[ blockData.ObjectIdentifier ] )
//     let frame = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.4 })

//     let blockSolid = new THREE.Mesh( geometry, solid )
//     let blockFrame = new THREE.Mesh( geometry, frame )

//     blockSolid.userData.objectData = blockData
//     blockSolid.userData.objectType = 'block'
    
//     for ( let cube of [ blockSolid, blockFrame ] ) {
//         cube.position.set( blockData.BlockSize.x/2, blockData.BlockSize.y/2, -blockData.BlockSize.z/2 )
//     }

//     let blockGroup = new THREE.Group()
//     blockGroup.add( blockSolid )
//     blockGroup.add( blockFrame )

//     let euler = convertFromUnityQuaternion( blockData.Rotation.x, blockData.Rotation.y, blockData.Rotation.z, blockData.Rotation.w )
    
//     blockGroup.position.set( -blockData.Position.x, blockData.Position.y, blockData.Position.z )
//     blockGroup.rotation.copy( euler )

//     blockSolid.userData.parentGroup = blockGroup
//     blockSolid.userData.drawFunc = addBlock

//     scene.add( blockGroup )

//     return blockSolid
// }

const addRamp = ( scene, propData ) => {
    let shape = new THREE.Shape()

    shape.moveTo( 0,  0 ) 
    shape.lineTo( 4,  0 )
    shape.lineTo( 0,  4 )
    shape.lineTo( 0,  0 )

    let ramp = new PropGeneric( propData, {
        geometry: new THREE.ExtrudeGeometry( shape, { depth: 4, bevelEnabled: false } ),
        drawFunc: addRamp
    })

    for ( let mesh of [ ramp.solidMesh, ramp.frameMesh ] ) {
        mesh.position.set(2, -2, 0)
        mesh.rotation.set(-Math.PI/2, -Math.PI/2, 0)
    }

    scene.add( ramp.positionGroup )
    return ramp.solidMesh
}
const addBarrel = ( scene, propData ) => {
    let barrel = new PropGeneric( propData, {
        geometry: new THREE.CylinderGeometry( 1, 1, 3, 8 ),
        drawFunc: addBarrel
    })

    for ( let mesh of [ barrel.solidMesh, barrel.frameMesh ] ) {
        mesh.position.set(0, 0, -1.5)
        mesh.rotation.set(-Math.PI/2, -Math.PI/2, 0)
    }

    scene.add( barrel.positionGroup )
    return barrel.solidMesh
}
const addBarrier = ( scene, propData ) => {
    let barrier = new PropGeneric( propData, {
        geometry: objectGeometry['ultrakill.barrier'],
        drawFunc: addBarrier
    })

    for ( let mesh of [ barrier.solidMesh, barrier.frameMesh ] ) {
        mesh.position.set(0, 0, 0)
        mesh.rotation.set(-Math.PI/2, 0, 0)
    }

    scene.add( barrier.positionGroup )
    return barrier.solidMesh
}
const addTree = ( scene, propData ) => {
    let tree = new PropGeneric( propData, {
        geometry: objectGeometry['ultrakill.tree'],
        drawFunc: addTree
    })

    scene.add( tree.positionGroup )
    return tree.solidMesh
}
const addMelon = ( scene, propData ) => {
    let melon = new PropGeneric( propData, {
        geometry: new THREE.IcosahedronGeometry( 1, 1 ),
        drawFunc: addMelon
    })

    for ( let mesh of [ melon.solidMesh, melon.frameMesh ] ) {
        mesh.position.set(0, 0, -1)
        mesh.scale.set(1.5, 1, 1)
    }

    scene.add( melon.positionGroup )
    return melon.solidMesh
}

const drawSandboxBlocks = ( scene, blocks ) => {
    for ( let i=0; i<blocks.length; i++ ) {
        let blockData = blocks[i]

        addBlock( scene, blockData )
    }
}
const drawSandboxProps = ( scene, props ) => {
    for ( let i=0; i<props.length; i++ ) {
        let propData = props[i]

        if ( propData.ObjectIdentifier.indexOf('ultrakill.ramp') !== -1 ) {
            addRamp( scene, propData )
        }

        if ( propData.ObjectIdentifier.indexOf('barrel') !== -1 ) {
            addBarrel( scene, propData )
        }

        if ( propData.ObjectIdentifier === 'ultrakill.barrier' ) {
            addBarrier( scene, propData )
        }

        if ( propData.ObjectIdentifier === 'ultrakill.tree' ) {
            addTree( scene, propData )
        }

        if ( propData.ObjectIdentifier === 'ultrakill.melon' ) {
            addMelon( scene, propData )
        }
    }
}

const getObjectData = ( obj ) => {
    return obj.userData.objectData
}

const disposeGroup = ( group ) => {
    while ( group.children.length ) {
        if ( group.children[0].type === 'Group' ) disposeGroup( group.children[0] )

        if ( group.children[0].material ) group.children[0].material.dispose()
        if ( group.children[0].geometry ) group.children[0].geometry.dispose()

        group.remove( group.children[0] )
    }
}

const clearScene = ( scene ) => {
    scene.traverse( obj => {
        if ( obj.type === 'Group' ) disposeGroup(obj)
    } )
}
const reloadScene = ( scene ) => {    
    clearScene( scene )

    EditingObject.selected = false
    EditingObject.hovered = false

    disableGUI()
    disableFreeTransform()

    drawSandboxBlocks(scene, Sandbox.getBlocks())
    drawSandboxProps(scene, Sandbox.getProps())
}

const addLights = ( scene ) => {
    let directional = new THREE.DirectionalLight( 0xffffff, 0.5 )
    scene.add( directional )

    let ambient = new THREE.AmbientLight( 0xffffff, 0.5 )
    scene.add( ambient )
}

// keyboard controls
const KeyPressed = {}

let reservedKeys = ['KeyR', 'KeyS', 'KeyG']
document.addEventListener('keydown', e => {
    if ( document.activeElement.tagName === 'INPUT' && reservedKeys.indexOf(e.code) !== -1 ) {
        e.preventDefault()
        e.stopPropagation()     
        
        document.getElementsByTagName('CANVAS')[0].focus()
        document.activeElement.blur()
    }

    if ( document.activeElement.tagName !== 'INPUT' ) {
        KeyPressed[e.code] = true

        e.preventDefault()
        e.stopPropagation()

        if ( e.code === 'Escape' ) {
            updateSelectedState( EditingObject.selected, false )
            EditingObject.selected = false

            disableFreeTransform()

            disableGUI()
        }

        if ( e.code === 'Delete' ) {
            if ( EditingObject.selected ) {
                deleteObject( EditingObject.selected )

                EditingObject.selected = false

                disableGUI()
            }
        }

        if ( e.code === 'AltLeft' ) {
            if ( FreeTransform.control ) enableTransformSnapping()
        }

        if ( KeyPressed.ControlLeft && e.code === 'KeyR' ) {
            if ( EditingObject.hovered ) {
                updateHoverState( EditingObject.hovered, false )
                EditingObject.hovered = false    
            }

            if ( EditingObject.selected ) {
                handleFreeRotate( EditingObject.selected )
            }
        }
        if ( KeyPressed.ControlLeft && e.code === 'KeyG' ) {
            if ( EditingObject.hovered ) {
                updateHoverState( EditingObject.hovered, false )
                EditingObject.hovered = false    
            }

            if ( EditingObject.selected ) {
                handleFreeTranslate( EditingObject.selected )
            }
        }
        if ( KeyPressed.ControlLeft && e.code === 'KeyS' ) {
            if ( EditingObject.hovered ) {
                updateHoverState( EditingObject.hovered, false )
                EditingObject.hovered = false    
            }

            if ( EditingObject.selected ) {
                handleFreeScale( EditingObject.selected )
            }
        }
    }
})
document.addEventListener('keyup', e => {
    if ( document.activeElement.tagName !== 'INPUT' ) {
        KeyPressed[e.code] = false
        
        e.preventDefault()
        e.stopPropagation()

        if ( e.code === 'AltLeft' ) {
            if ( FreeTransform.control ) disableTransformSnapping()
        }
    }
})

// mouse controls
const Mouse = {
    vector: new THREE.Vector2(),
    raycaster: new THREE.Raycaster()
}
const FreeTransform = {
    control: false,

    rotating: false,
    translating: false,
    scaling: false,
}

const getIntersectingObject = ( scene ) => {
    Mouse.raycaster.setFromCamera( Mouse.vector, camera )
    let intersects = Mouse.raycaster.intersectObjects( scene.children )
    let mesh

    // console.log(intersects)

    if ( intersects.length >= 2 ) {
        for ( let i=0; i<2; i++ ) {
            if ( intersects[i].object.userData.objectData ) mesh = intersects[i]
        }
    }
    
    return mesh || false
}

const setupTransformControls = ( target ) => {
    let transformControl = new TransformControls( camera, document.getElementsByTagName('CANVAS')[0] )

    transformControl.attach(target)
    transformControl.addEventListener('dragging-changed', e => {
        controls.enabled = !e.value
    })

    return transformControl
}

const enableTransformSnapping = () => {
    FreeTransform.control.rotationSnap = Math.PI*2 / 16
    FreeTransform.control.translationSnap = 0.5
    FreeTransform.control.setScaleSnap(0.25)
}
const disableTransformSnapping = () => {
    FreeTransform.control.rotationSnap = null
    FreeTransform.control.translationSnap = null
    FreeTransform.control.setScaleSnap(null)
}

const handleFreeTranslate = ( obj, redrawing = false ) => {
    if ( FreeTransform.control ) {
        disableFreeTransform('translating')

        if ( FreeTransform.translating && !redrawing ) {
            FreeTransform.translating = false
            return
        }
    }

    let group = obj.userData.parentGroup
    
    FreeTransform.control = setupTransformControls( group )

    FreeTransform.control.setMode('translate')
    FreeTransform.control.addEventListener('mouseUp', e => {        
        updateObjectPosition( obj, { x: group.position.x, y: group.position.y, z: group.position.z } )
        updateObjectGUI( obj )
    })

    FreeTransform.redraw = () => handleFreeTranslate( EditingObject.selected, true )

    scene.add( FreeTransform.control )
    FreeTransform.translating = true
}

const handleFreeRotate = ( obj, redrawing = false ) => {
    if ( FreeTransform.control ) {
        disableFreeTransform('rotating')

        if ( FreeTransform.rotating && !redrawing ) {
            FreeTransform.rotating = false
            return
        }
    }

    let group = obj.userData.parentGroup
    
    FreeTransform.control = setupTransformControls( group )

    FreeTransform.control.setMode('rotate')
    FreeTransform.control.addEventListener('mouseUp', e => {        
        updateObjectRotation( obj, { x: group.rotation.x, y: group.rotation.y, z: group.rotation.z } )
        updateObjectGUI( obj )
    })

    FreeTransform.redraw = () => handleFreeRotate( EditingObject.selected, true )

    scene.add( FreeTransform.control )
    FreeTransform.rotating = true
}

const handleFreeScale = ( obj, redrawing = false ) => {
    if ( FreeTransform.control ) {
        disableFreeTransform('scaling')

        if ( FreeTransform.scaling && !redrawing ) {
            FreeTransform.scaling = false
            return
        }
    }

    let group = obj.userData.scaleGroup
    
    FreeTransform.control = setupTransformControls( group )

    FreeTransform.control.setMode('scale')
    FreeTransform.control.addEventListener('mouseUp', e => {        
        updateObjectScaleAll( obj, { x: group.scale.x, y: group.scale.y, z: group.scale.z } )
        updateObjectGUI( obj )
    })

    FreeTransform.redraw = () => handleFreeScale( EditingObject.selected, true )

    scene.add( FreeTransform.control )
    FreeTransform.scaling = true
}

const disableFreeTransform = (exclude) => {
    let toDisable = ['rotating', 'translating', 'scaling']
    toDisable.splice( toDisable.indexOf(exclude), 1 )

    if ( FreeTransform.control ) {
        FreeTransform.control.dispose()
        scene.remove( FreeTransform.control )

        for (let prop of toDisable) {
            FreeTransform[prop] = false
        }

        FreeTransform.control = false
    }
}

const updateHoverState = ( obj, state ) => {
    obj.userData.hoverState = state
    updateEditingObjectMaterial( obj )
}
const updateSelectedState = ( obj, state ) => {
    obj.userData.selectedState = state
    updateEditingObjectMaterial( obj )
}
const updateEditingObjectMaterial = (obj) => {
    if ( !obj ) return
    
    let emissiveColor = 0x000000
    
    if ( obj.userData.hoverState ) emissiveColor = 0xdddddd
    if ( obj.userData.selectedState ) emissiveColor = 0xff00ff

    obj.material.emissive.set( emissiveColor )
}

const updateHoveredObject = ( mesh ) => {
    if ( !mesh && EditingObject.hovered ) {
        updateHoverState( EditingObject.hovered, false )
        EditingObject.hovered = false

        return
    }
    if ( mesh && mesh.object !== EditingObject.hovered ) {
        if (EditingObject.hovered) {
            updateHoverState( EditingObject.hovered, false )
        }

        EditingObject.hovered = mesh.object
        updateHoverState( EditingObject.hovered, true )
    }
}
const updateSelectedObject = () => {
    if ( EditingObject.hovered ) {
        if ( EditingObject.selected ) {
            updateSelectedState( EditingObject.selected, false )
        } 
        
        EditingObject.selected = EditingObject.hovered
        updateSelectedState( EditingObject.selected, true )
    } else {
        if ( !EditingObject.selected ) return

        updateSelectedState( EditingObject.selected, false )
        EditingObject.selected = false
    }

    hideAxisDisplay()
    disableFreeTransform()
}

const handleMouseMove = ( e ) => {
    Mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    Mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

    Mouse.vector.x = Mouse.x
    Mouse.vector.y = Mouse.y

    if (!FreeTransform.control) updateHoveredObject( getIntersectingObject( scene ) )
}
const handleMouseDown = ( e ) => {
    if (e.button === 2) { 
        updateSelectedObject()

        if (EditingObject.selected) {
            updateGUI( EditingObject.selected )
        } else {
            disableGUI()
        }
    }
}

document.addEventListener('mousemove', e => {
    if ( document.elementFromPoint( e.clientX, e.clientY ) && document.elementFromPoint( e.clientX, e.clientY ).tagName !== 'CANVAS' ) {
        if ( EditingObject.hovered ) {
            updateHoverState( EditingObject.hovered, false )
            EditingObject.hovered = false    
        }
    }
})

const setNested = (obj, path, value) => {
    var schema = obj;  // a moving reference to internal objects within obj
    var pList = path.split('.');
    var len = pList.length;
    for(var i = 0; i < len-1; i++) {
        var elem = pList[i];
        if( !schema[elem] ) schema[elem] = {}
        schema = schema[elem];
    }

    schema[pList[len-1]] = value;
}

const updateObjectProperty = ( obj, prop, value ) => {
    if ( !obj ) return

    let data = getObjectData( obj )
    setNested(data, prop, value)

    redrawObject( obj, data )
}
const updateObjectWeak = ( obj, value ) => {
    if ( !obj ) return

    let data = getObjectData( obj )
    data.Data[0].Options[0].BoolValue = value

    redrawObject( obj, data )
}
const updateObjectUnbreakable = ( obj, value ) => {
    if ( !obj ) return

    let data = getObjectData( obj )
    data.Data[0].Options[1].BoolValue = value

    redrawObject( obj, data )
}
const updateObjectScale = ( obj, axis, value ) => {
    if ( !obj ) return

    let data = getObjectData( obj )
    let property = obj.userData.objectType === 'block' ? 'BlockSize' : 'Scale'
    
    data[property][axis] = value

    redrawObject( obj, data )
}
const updateObjectScaleAll = ( obj, scale ) => {
    if ( !obj ) return

    let data = getObjectData( obj )
    let property = obj.userData.objectType === 'block' ? 'BlockSize' : 'Scale'
    
    data[property].x = scale.x
    data[property].y = scale.y
    data[property].z = scale.z

    redrawObject( obj, data )
}
const updateObjectPosition = ( obj, position ) => {
    if ( !obj ) return

    let data = getObjectData( obj )
    
    data.Position.x = -position.x
    data.Position.y = position.y
    data.Position.z = position.z

    redrawObject( obj, data )
}
const updateObjectRotation = ( obj, rotation ) => {
    if ( !obj ) return

    let data = getObjectData( obj )
    let unityQuaternion = convertToUnityQuaternion( rotation.x, rotation.y, rotation.z )

    data.Rotation.x = unityQuaternion.x
    data.Rotation.y = unityQuaternion.y
    data.Rotation.z = unityQuaternion.z
    data.Rotation.w = unityQuaternion.w

    redrawObject( obj, data )
    // console.log( obj.userData.objectData.Rotation, unityQuaternion )
}

const redrawObject = ( obj, newData ) => {
    let oldData = obj.userData.objectData

    disposeGroup( obj.userData.parentGroup )
    
    let redrawnObject = obj.userData.drawFunc( scene, newData )
    EditingObject.selected = redrawnObject
    updateSelectedState( EditingObject.selected, true )

    if (AxisDisplay.object) AxisDisplay.redraw()
    if (FreeTransform.control) FreeTransform.redraw()

    Sandbox.updateObject( obj.userData.objectType, oldData, newData )
}

const deleteObject = ( obj ) => {
    Sandbox.removeObject( obj.userData.objectType, obj.userData.objectData )

    disposeGroup( obj.userData.parentGroup )
}

const axisColors = {
    x: 0xff0000,
    y: 0x00ff00,
    z: 0x0000ff,
}

const hideAxisDisplay = () => {
    if ( AxisDisplay.object ) {
        // if ( AxisDisplay.object.material ) AxisDisplay.object.material.dispose()
        // if ( AxisDisplay.object.geometry ) AxisDisplay.object.geometry.dispose()
        disposeGroup( AxisDisplay.object )
        scene.remove( AxisDisplay.object )

        AxisDisplay.object = false
    }    
}

const AxisDisplayObject = class AxisDisplayObject {
    constructor(axis) {
        let axisLinePoints = [ new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0) ]

        axisLinePoints[0][axis] = -999999
        axisLinePoints[2][axis] = 999999

        let axisLineGeometry = new THREE.BufferGeometry().setFromPoints( axisLinePoints )

        let axisLine = new THREE.Line( axisLineGeometry, new THREE.LineBasicMaterial({ color: axisColors[axis] }) )
        
        // axisLine.renderOrder = 999
        // axisLine.material.depthTest = false

        let axisDotted = new THREE.Line( axisLineGeometry, new THREE.LineDashedMaterial({ color: axisColors[axis], dashSize: 0.5, gapSize: 0.5, scale: 1 }) )
        axisDotted.computeLineDistances()
        
        axisDotted.renderOrder = 999
        axisDotted.material.depthTest = false

        // this is probably not very good programming but i'll fix it later
        let originXPoints = [ new THREE.Vector3(-2, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0) ]
        let originXGeometry = new THREE.BufferGeometry().setFromPoints( originXPoints )
        let originXLine = new THREE.Line( originXGeometry, new THREE.LineBasicMaterial({ color: axisColors.x }) )

        originXLine.renderOrder = 999
        originXLine.material.depthTest = false

        let originYPoints = [ new THREE.Vector3(0, -2, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2, 0) ]
        let originYGeometry = new THREE.BufferGeometry().setFromPoints( originYPoints )
        let originYLine = new THREE.Line( originYGeometry, new THREE.LineBasicMaterial({ color: axisColors.y }) )

        originYLine.renderOrder = 999
        originYLine.material.depthTest = false

        let originZPoints = [ new THREE.Vector3(0, 0, -2), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 2) ]
        let originZGeometry = new THREE.BufferGeometry().setFromPoints( originZPoints )
        let originZLine = new THREE.Line( originZGeometry, new THREE.LineBasicMaterial({ color: axisColors.z }) )

        originZLine.renderOrder = 999
        originZLine.material.depthTest = false

        let lineGroup = new THREE.Group()

        lineGroup.add(axisLine)
        lineGroup.add(axisDotted)

        axis === 'x' || lineGroup.add(originXLine)
        axis === 'y' || lineGroup.add(originYLine)
        axis === 'z' || lineGroup.add(originZLine)

        this.object = lineGroup
    }
}
const RotationalAxisDisplayObject = class RotationalAxisDisplayObject {
    constructor(axis) {
        // this is probably not very good programming but i'll fix it later
        let rotationLine = {}

        for ( let currentAxis of ['x', 'y', 'z'] ) {
            let plane = ['x', 'y', 'z']
            plane.splice( plane.indexOf(currentAxis), 1 )

            let points = []          
            let mult = currentAxis === axis ? 3 : 2  
            for (let i=0; i<17; i++) {
                let point = new THREE.Vector3(0, 0, 0)

                point[ plane[0] ] = Math.cos( Math.PI*2 / 16 * i ) * mult
                point[ plane[1] ] = Math.sin( Math.PI*2 / 16 * i ) * mult

                points.push( point )
            }

            let geometry = new THREE.BufferGeometry().setFromPoints( points )
            rotationLine[currentAxis] = new THREE.Line( geometry, new THREE.LineBasicMaterial({ color: axisColors[currentAxis], depthTest: false }) )

            rotationLine[currentAxis].renderOrder = 999
        }

        let yGroup = new THREE.Group()

        yGroup.add( rotationLine.y )
        yGroup.add( rotationLine.z )

        let xGroup = new THREE.Group()

        xGroup.add( rotationLine.x )
        xGroup.add( yGroup )

        let lineGroup = new THREE.Group()

        lineGroup.add(xGroup)

        this.xContainer = xGroup
        this.yContainer = yGroup
        this.zContainer = rotationLine.z

        this.object = lineGroup
    }
}

const drawPositionalAxisDisplay = ( obj, axis ) => {
    hideAxisDisplay()

    let axisObject = new AxisDisplayObject(axis)

    AxisDisplay.object = axisObject.object
    AxisDisplay.redraw = () => drawPositionalAxisDisplay( EditingObject.selected, axis )

    let position = new THREE.Vector3().copy( obj.userData.parentGroup.position )

    AxisDisplay.object.position.copy( position )

    scene.add( AxisDisplay.object )
}
const drawScalingAxisDisplay = ( obj, axis ) => {
    hideAxisDisplay()

    let axisObject = new AxisDisplayObject(axis)

    AxisDisplay.object = axisObject.object
    AxisDisplay.redraw = () => drawScalingAxisDisplay( EditingObject.selected, axis )

    let position = new THREE.Vector3().copy( obj.userData.parentGroup.position )

    AxisDisplay.object.position.copy( position )
    AxisDisplay.object.rotation.copy( obj.userData.parentGroup.rotation )

    scene.add( AxisDisplay.object )
}
const drawRotationalAxisDisplay = ( obj, axis ) => {
    hideAxisDisplay()

    let axisObject = new RotationalAxisDisplayObject(axis)

    axisObject.xContainer.rotation.copy( new THREE.Euler( obj.userData.parentGroup.rotation.x, 0, 0 ) )
    axisObject.yContainer.rotation.copy( new THREE.Euler( 0, obj.userData.parentGroup.rotation.y, 0 ) )
    axisObject.zContainer.rotation.copy( new THREE.Euler( 0, 0, obj.userData.parentGroup.rotation.z ) )

    AxisDisplay.object = axisObject.object
    AxisDisplay.redraw = () => drawRotationalAxisDisplay( EditingObject.selected, axis )

    let position = new THREE.Vector3().copy( obj.userData.parentGroup.position )

    AxisDisplay.object.position.copy( position )
    // AxisDisplay.object.rotation.copy( obj.userData.parentGroup.rotation )

    // AxisDisplay.
    // console.log( obj.userData.parentGroup.rotation )

    scene.add( AxisDisplay.object )
}

// gooey
const handleNumberInput = (input) => {
    input.addEventListener('input', e => {
        if (EditingObject.selected) updateObjectProperty( EditingObject.selected, input.dataset.property, parseFloat(input.value) )
    })    

    if ( input.dataset.property.indexOf('Position') !== -1 ) {
        input.addEventListener('focus', e => {
            drawPositionalAxisDisplay( EditingObject.selected, input.dataset.property.split('.')[1] )
            disableFreeTransform()
        })
    }
    if ( input.dataset.property.indexOf('Scale') !== -1 || input.dataset.property.indexOf('BlockSize') !== -1 ) {
        input.addEventListener('focus', e => {
            drawScalingAxisDisplay( EditingObject.selected, input.dataset.property.split('.')[1] )
        })
    }
    
    input.addEventListener('blur', e => {
        if ( input.dataset.property.indexOf('Scale') !== -1 || input.dataset.property.indexOf('BlockSize') !== -1 ) {
            if ( parseFloat(input.value) === 0 || parseFloat(input.value) === -0 ) { // negative zero yeah
                input.value = 0.001
                if (EditingObject.selected) updateObjectProperty( EditingObject.selected, input.dataset.property, parseFloat(input.value) )
            }
        }
        
        hideAxisDisplay()
    })
}
const handleToggleInput = (input) => {
    input.addEventListener('input', e => {
        if (EditingObject.selected) updateObjectProperty( EditingObject.selected, input.dataset.property, input.checked )
    })
}

const GUI = {}

const updateGUI = ( obj ) => {
    let guiElements = document.querySelectorAll('.object_data_container')
    for (let el of guiElements) {
        el.classList.add('hidden')
    }

    switch (obj.userData.objectType) {
        case 'block':
            updateObjectGUI( obj )
            break
        case 'prop':
            updateObjectGUI( obj )
            break
        default:
            return 'unknown object type'
    }
}

// disabled 
GUI.disabled = {}
GUI.disabled.element = document.getElementById('disabled_data')

const disableGUI = () => {
    let guiElements = document.querySelectorAll('.object_data_container')
    for (let el of guiElements) {
        el.classList.add('hidden')
    }
    
    GUI.disabled.element.classList.remove('hidden')
}

// block
GUI.object = {}
GUI.object.element = document.getElementById('block_data')

const toDegrees = ( rad ) => {
    return rad * 180/Math.PI
}
const toRadians = ( rad ) => {
    return rad * Math.PI/180
}

const updateObjectGUI = ( obj ) => {
    let data = obj.userData.objectData

    if ( !data ) return

    let scale = obj.userData.objectType === 'block' ? data.BlockSize : data.Scale

    GUI.object.element.classList.remove('hidden')

    GUI.object.element.querySelector('#block_type').innerText = data.ObjectIdentifier

    let posInputs = Array.from( GUI.object.element.querySelectorAll('#position input') )
    posInputs[0].value = data.Position.x
    posInputs[1].value = data.Position.y
    posInputs[2].value = data.Position.z

    let scaleInputs = Array.from( GUI.object.element.querySelectorAll('#scale input') )
    scaleInputs[0].value = scale.x
    scaleInputs[1].value = scale.y
    scaleInputs[2].value = scale.z

    let rotationInputs = Array.from( GUI.object.element.querySelectorAll('.rotation') )

    let eulerRotation = convertFromUnityQuaternion( data.Rotation.x, data.Rotation.y, data.Rotation.z, data.Rotation.w )

    rotationInputs[0].value = toDegrees(eulerRotation.x)
    rotationInputs[1].value = toDegrees(eulerRotation.y)
    rotationInputs[2].value = toDegrees(eulerRotation.z)

    let frozenInput = GUI.object.element.querySelector('#block_frozen')
    frozenInput.checked = data.Kinematic

    let weakInput = GUI.object.weakToggle
    let unbreakableInput = GUI.object.unbreakableToggle

    if ( data.Data ) {
        weakInput.disabled = false
        weakInput.checked = data.Data[0].Options[0].BoolValue

        unbreakableInput.disabled = false
        unbreakableInput.checked = data.Data[0].Options[1].BoolValue
    } else {
        weakInput.disabled = true
        weakInput.checked = false

        unbreakableInput.disabled = true
        unbreakableInput.checked = false
    }
}

GUI.object.numberInputs = GUI.object.element.querySelectorAll('input[type="number"]')
for (let input of GUI.object.numberInputs) {
    if ( !input.classList.contains('auto_exclude') ) {
        handleNumberInput( input )
    }
}

GUI.object.scaleInputs = GUI.object.element.querySelectorAll('.scale')
for (let input of GUI.object.scaleInputs) {
    input.addEventListener('input', e => {
        updateObjectScale( EditingObject.selected, input.dataset.property, parseFloat(input.value) )
    })
    
    input.addEventListener('focus', e => {
        drawScalingAxisDisplay( EditingObject.selected, input.dataset.property )
        disableFreeTransform()
    })
    
    input.addEventListener('blur', e => {
        if ( parseFloat(input.value) === 0 || parseFloat(input.value) === -0 ) { // negative zero yeah
            input.value = 0.001
            if (EditingObject.selected) updateObjectProperty( EditingObject.selected, input.dataset.property, parseFloat(input.value) )
        }
        
        hideAxisDisplay()
    })
}

GUI.object.rotationInputs = GUI.object.element.querySelectorAll('.rotation')
GUI.object.rotationX = GUI.object.element.querySelector('#rotation_x')
GUI.object.rotationY = GUI.object.element.querySelector('#rotation_y')
GUI.object.rotationZ = GUI.object.element.querySelector('#rotation_z')

for (let input of GUI.object.rotationInputs) {
    input.addEventListener('input', e => {
        let x = toRadians(parseFloat(GUI.object.rotationX.value))
        let y = toRadians(parseFloat(GUI.object.rotationY.value))
        let z = toRadians(parseFloat(GUI.object.rotationZ.value))

        if (EditingObject.selected) {
            updateObjectRotation( EditingObject.selected, { x: x, y: y, z: z } )
        }
    })
    
    input.addEventListener('focus', e => {
        drawRotationalAxisDisplay( EditingObject.selected, input.id.split('_')[1] )
        disableFreeTransform()
    })

    input.addEventListener('blur', e => {        
        hideAxisDisplay()
    })
}

GUI.object.toggleInputs = GUI.object.element.querySelectorAll('input[type="checkbox"]')
for (let input of GUI.object.toggleInputs) {
    if ( !input.classList.contains('auto_exclude') ) {
        handleToggleInput( input )
    }
}

GUI.object.weakToggle = GUI.object.element.querySelector('#block_weak')
GUI.object.weakToggle.addEventListener('change', e => {
    if (EditingObject.selected) updateObjectWeak( EditingObject.selected, GUI.object.weakToggle.checked )
})

GUI.object.unbreakableToggle = GUI.object.element.querySelector('#block_unbreakable')
GUI.object.unbreakableToggle.addEventListener('change', e => {
    if (EditingObject.selected) updateObjectUnbreakable( EditingObject.selected, GUI.object.unbreakableToggle.checked )
})

// prop (i think this is basically the exact same setup as the block gui oops)
// GUI.prop = {}
// GUI.prop.element = document.getElementById('prop_data')

// const updatePropGUI = ( data ) => {
//     if (!data) return

//     GUI.prop.element.classList.remove('hidden')

//     GUI.prop.element.querySelector('#prop_type').innerText = data.ObjectIdentifier

//     let posInputs = Array.from( GUI.prop.element.querySelectorAll('#position input') )
//     posInputs[0].value = data.Position.x
//     posInputs[1].value = data.Position.y
//     posInputs[2].value = data.Position.z

//     let scaleInputs = Array.from( GUI.prop.element.querySelectorAll('#scale input') )
//     scaleInputs[0].value = data.Scale.x
//     scaleInputs[1].value = data.Scale.y
//     scaleInputs[2].value = data.Scale.z

//     let frozenInput = GUI.prop.element.querySelector('#prop_frozen')
//     frozenInput.checked = data.Kinematic

//     let weakInput = GUI.prop.weakToggle
//     let unbreakableInput = GUI.prop.unbreakableToggle

//     if ( data.Data ) {
//         weakInput.disabled = false
//         weakInput.checked = data.Data[0].Options[0].BoolValue

//         unbreakableInput.disabled = false
//         unbreakableInput.checked = data.Data[0].Options[1].BoolValue
//     } else {
//         weakInput.disabled = true
//         weakInput.checked = false

//         unbreakableInput.disabled = true
//         unbreakableInput.checked = false
//     }
// }

// GUI.prop.numberInputs = GUI.prop.element.querySelectorAll('input[type="number"]')
// for (let input of GUI.prop.numberInputs) {
//     if ( !input.classList.contains('auto_exclude') ) {
//         handleNumberInput( input )
//     }
// }

// GUI.prop.toggleInputs = GUI.prop.element.querySelectorAll('input[type="checkbox"]')
// for (let input of GUI.prop.toggleInputs) {
//     handleToggleInput( input )
// }

// GUI.prop.weakToggle = GUI.prop.element.querySelector('#prop_weak')
// GUI.prop.weakToggle.addEventListener('change', e => {
//     if (EditingObject.selected) updateObjectWeak( EditingObject.selected, GUI.prop.weakToggle.checked )
// })

// GUI.prop.unbreakableToggle = GUI.prop.element.querySelector('#prop_unbreakable')
// GUI.prop.unbreakableToggle.addEventListener('change', e => {
//     if (EditingObject.selected) updateObjectUnbreakable( EditingObject.selected, GUI.prop.unbreakableToggle.checked )
// })

GUI.deleteElements = document.querySelectorAll('.delete_selected_object')
for (let el of GUI.deleteElements) {
    el.addEventListener('click', () => {
        if ( EditingObject.selected ) {
            deleteObject( EditingObject.selected )

            EditingObject.selected = false
            disableGUI()
        }        
    })
}

// save
document.getElementById('save').addEventListener('click', e => {
    let link = document.createElement('a')
    let file = new Blob( [Sandbox.getMapData()], { type: 'text/plain' } )

    link.href = URL.createObjectURL( file )
    link.download = sandboxFilename || 'untitled.pitr'
    link.click()

    URL.revokeObjectURL(link.href)
})

// help
if ( !localStorage.getItem('seenHelpDialog') ) document.getElementById('help_dialog').style.display = 'flex'

document.getElementById('close_help_dialog').addEventListener('click', () => {
    document.getElementById('help_dialog').style.display = 'none'
    localStorage.setItem('seenHelpDialog', 'true')
})
document.getElementById('help').addEventListener('click', () => {
    document.getElementById('help_dialog').style.display = 'flex'
})

// render stuff
const setupDefaultScene = ( controls ) => {
    controls.forward( -420, false ) // haa ha
    controls.truck( -60, false )
    controls.rotate( Math.PI - Math.PI/9, 0, false )

    Sandbox.loadMap( JSON.parse(defaultSceneData) )
    reloadScene( scene )
}

const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize( window.innerWidth, window.innerHeight )
}

// https://github.com/Fyrestar/THREE.InfiniteGridHelper
class InfiniteGridHelper extends THREE.Mesh {

    constructor ( size1, size2, color, distance, axes = 'xzy' ) {


        color = color || new THREE.Color( 'white' );
        size1 = size1 || 10;
        size2 = size2 || 100;

        distance = distance || 8000;



        const planeAxes = axes.substr( 0, 2 );

        const geometry = new THREE.PlaneGeometry( 2, 2, 1, 1 );

        const material = new THREE.ShaderMaterial( {

            side: THREE.DoubleSide,

            uniforms: {
                uSize1: {
                    value: size1
                },
                uSize2: {
                    value: size2
                },
                uColor: {
                    value: color
                },
                uDistance: {
                    value: distance
                }
            },
            transparent: true,
            vertexShader: `
       
       varying vec3 worldPosition;
       
       uniform float uDistance;
       
       void main() {
       
            vec3 pos = position.${axes} * uDistance;
            pos.${planeAxes} += cameraPosition.${planeAxes};
            
            worldPosition = pos;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
       
       }
       `,


            fragmentShader: `
       
       varying vec3 worldPosition;
       
       uniform float uSize1;
       uniform float uSize2;
       uniform vec3 uColor;
       uniform float uDistance;
        
        
        
        float getGrid(float size) {
        
            vec2 r = worldPosition.${planeAxes} / size;
            
            
            vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
            float line = min(grid.x, grid.y);
            
        
            return 1.0 - min(line, 1.0);
        }
        
       void main() {
       
            
              float d = 1.0 - min(distance(cameraPosition.${planeAxes}, worldPosition.${planeAxes}) / uDistance, 1.0);
            
              float g1 = getGrid(uSize1);
              float g2 = getGrid(uSize2);
              
              
              gl_FragColor = vec4(uColor.rgb, mix(g2, g1, g1) * pow(d, 3.0));
              gl_FragColor.a = mix(0.5 * gl_FragColor.a, gl_FragColor.a, g2);
            
              if ( gl_FragColor.a <= 0.0 ) discard;
            
       
       }
       
       `,

            extensions: {
                derivatives: true
            }

        } );

        super( geometry, material );

        this.frustumCulled = false;

    }

}

const init = () => {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 )

    addLights( scene )

    let infiniteGrid = new InfiniteGridHelper(4, 100)

    infiniteGrid.material.uniforms.uDistance.value = 500
    infiniteGrid.material.uniforms.uColor.value.set( new THREE.Color(0xAAAAAA) )
    infiniteGrid.position.y = -10.5

    scene.add( infiniteGrid )

    camera.position.z = -5

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize( window.innerWidth, window.innerHeight )

    controls = new CameraControls( camera, renderer.domElement )
    controls.dollyToCursor = true
    controls.infinityDolly = true

    setupDefaultScene( controls )

    document.body.appendChild(renderer.domElement)
    renderer.domElement.addEventListener('mousemove', handleMouseMove, false)
    renderer.domElement.addEventListener('mousedown', handleMouseDown, false)
    
    window.addEventListener( 'resize', resize )

    update()
}
const update = () => {
    let delta = clock.getDelta()

    // keyboard camera movement
    if (!KeyPressed.ControlLeft) {
        if (KeyPressed.KeyW) controls.forward( Prefs.getMoveSpeed() * delta, false )
        if (KeyPressed.KeyS) controls.forward( -Prefs.getMoveSpeed() * delta, false ) 
        if (KeyPressed.KeyD) controls.truck(  Prefs.getMoveSpeed() * delta, false ) 
        if (KeyPressed.KeyA) controls.truck( -Prefs.getMoveSpeed() * delta, false ) 
        if (KeyPressed.KeyE) controls.elevate(  Prefs.getMoveSpeed() * delta, false ) 
        if (KeyPressed.KeyQ) controls.elevate( -Prefs.getMoveSpeed() * delta, false ) 
    }

    controls.update( delta )

    renderer.render( scene, camera )

    requestAnimationFrame( update )
}

// load in prop models and stuff
const manager = new THREE.LoadingManager()
const loader = new OBJLoader( manager )

const modelsToLoad = [
    'assets/models/barrier.obj',
    'assets/models/tree.obj'
]
const objectGeometry = {}

const loadAsyncWithModelName = ( url ) => {
    return new Promise( resolve => {
        loader.load( url, obj => {
            let name = url.split('/')[2].split('.')[0]
            resolve( {model: obj, name: name} )
        })
    })
}

Promise.all( modelsToLoad.map( x => loadAsyncWithModelName(x) ) ).then( models => {
    for ( let model of models ) {
        objectGeometry[ `ultrakill.${model.name}` ] = model.model.children[0].geometry
    }
    
    init()
})

if ( import.meta.env.MODE !== 'development' ) {
    window.onbeforeunload = e => {
        for (let key in KeyPressed) {
            KeyPressed[key] = false
        }

        return 'Changes you made may not be saved.'
    }
}