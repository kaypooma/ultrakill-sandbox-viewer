import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

import CameraControls from 'camera-controls';

import SandboxManager from './sandman';
import Logger from './logger';
import AddObjectMenu from './addobjectmenu';
import ObjectGui from './objectgui';
import PropGeneric from './propgeneric';
import MathEx from './mathex';

// import * as jsondata from './data.js';
import defaultSceneData from './data/defaultscene.json';

CameraControls.install({ THREE: THREE })

const AddMenu = new AddObjectMenu("unused")
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

// loggers
let Log_Main = new Logger("Main")
let Log_FS = new Logger("FS")

// file stuff
const fileElement = document.getElementById('sandbox_file')

const handleSandboxFile = () => {
    let files = fileElement.files

    if (files[0]) {
        let reader = new FileReader()
        reader.onload = (e) => {
            Sandbox.loadMap( JSON.parse(e.target.result) )
            reloadScene(scene)
            if (IsOverlayVisible('startup') == true) {
                SetOverlayVisible(false, 'startup');
            }
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

const createNewBlock = (id) => {
    // spawn near the camera because sandbox tends to be very offset.
    // TODO: Figure out how to work this into the new system
    let spawnPos = {'x': 0, 'y': 0, 'z': 0}

    spawnPos.x = -camera.position.x
    spawnPos.y = camera.position.y
    spawnPos.z = camera.position.z - 9

    Log_Main.Info(`Creating new block of type ${id}`)
    Sandbox.addObject('block', id)
    reloadScene( scene )
}

const createNewProp = (id) => {
    // spawn near the camera because sandbox tends to be very offset.
    // TODO: Figure out how to work this into the new system
    let spawnPos = {'x': 0, 'y': 0, 'z': 0}

    spawnPos.x = -camera.position.x
    spawnPos.y = camera.position.y
    spawnPos.z = camera.position.z - 9

    Log_Main.Info(`Creating new prop of type ${id}`)
    Sandbox.addObject('prop', id)
    reloadScene( scene )
}

AddMenu.addCallbacks = {
    'brushes': createNewBlock,
    'props': createNewProp
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

const addProp = {}

addProp['unknown'] = ( scene, propData ) => {
    let prop = new PropGeneric( propData, {
        geometry: objectGeometry['uksandbox.missing'],
        drawFunc: addProp['unknown']
    })

    scene.add( prop.positionGroup )
    return prop.solidMesh
}

addProp['ultrakill.ramp'] = ( scene, propData ) => {
    let shape = new THREE.Shape()

    shape.moveTo( 0,  0 )
    shape.lineTo( 4,  0 )
    shape.lineTo( 0,  4 )
    shape.lineTo( 0,  0 )

    let ramp = new PropGeneric( propData, {
        geometry: new THREE.ExtrudeGeometry( shape, { depth: 4, bevelEnabled: false } ),
        drawFunc: addProp['ultrakill.ramp']
    })

    for ( let mesh of [ ramp.solidMesh, ramp.frameMesh ] ) {
        mesh.position.set(2, -2, 0)
        mesh.rotation.set(-Math.PI/2, -Math.PI/2, 0)
    }

    scene.add( ramp.positionGroup )
    return ramp.solidMesh
}
addProp['ultrakill.ramp-stone'] = addProp['ultrakill.ramp']

addProp['ultrakill.barrel'] = ( scene, propData ) => {
    let barrel = new PropGeneric( propData, {
        geometry: new THREE.CylinderGeometry( 1, 1, 3, 8 ),
        drawFunc: addProp['ultrakill.barrel']
    })

    for ( let mesh of [ barrel.solidMesh, barrel.frameMesh ] ) {
        mesh.position.set(0, 0, -1.5)
        mesh.rotation.set(-Math.PI/2, -Math.PI/2, 0)
    }

    scene.add( barrel.positionGroup )
    return barrel.solidMesh
}
addProp['ultrakill.explosive-barrel'] = addProp['ultrakill.barrel']

addProp['ultrakill.barrier'] = ( scene, propData ) => {
    let barrier = new PropGeneric( propData, {
        geometry: objectGeometry['ultrakill.barrier'],
        drawFunc: addProp['ultrakill.barrier']
    })

    for ( let mesh of [ barrier.solidMesh, barrier.frameMesh ] ) {
        mesh.position.set(0, 0, 0)
        mesh.rotation.set(-Math.PI/2, 0, 0)
    }

    scene.add( barrier.positionGroup )
    return barrier.solidMesh
}

addProp['ultrakill.tree'] = ( scene, propData ) => {
    let tree = new PropGeneric( propData, {
        geometry: objectGeometry['ultrakill.tree'],
        drawFunc: addProp['ultrakill.tree']
    })

    scene.add( tree.positionGroup )
    return tree.solidMesh
}

addProp['ultrakill.melon'] = ( scene, propData ) => {
    let melon = new PropGeneric( propData, {
        geometry: new THREE.IcosahedronGeometry( 1, 1 ),
        drawFunc: addProp['ultrakill.melon']
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
        let prop = props[i]

        // turn back on if you need paranoid logging
        Log_Main.Info(`Found prop with type ${prop.id}`)
        if (addProp[prop.id] == null) {
            Log_Main.Warn(`No draw func is defined for prop type ${prop.id}. This object will not appear correctly.`)
            addProp['unknown']( scene, prop )
        } else {
            addProp[prop.id]( scene, prop )
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

    ObjGui.disableGUI()
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

const moveBut = document.getElementById('mode-move');
const rotBut = document.getElementById('mode-rot');
const scaleBut = document.getElementById('mode-scale');
const noneBut = document.getElementById('mode-none');

moveBut.addEventListener('click', () => {
	if ( EditingObject.hovered ) {
		updateHoverState( EditingObject.hovered, false )
		EditingObject.hovered = false
	}

	if ( EditingObject.selected ) {
		handleFreeTranslate( EditingObject.selected )
	}
});

rotBut.addEventListener('click', () => {
	if ( EditingObject.hovered ) {
		updateHoverState( EditingObject.hovered, false )
		EditingObject.hovered = false
	}

	if ( EditingObject.selected ) {
		handleFreeRotate( EditingObject.selected )
	}
});

scaleBut.addEventListener('click', () => {
	if ( EditingObject.hovered ) {
		updateHoverState( EditingObject.hovered, false )
		EditingObject.hovered = false
	}

	if ( EditingObject.selected ) {
		handleFreeScale( EditingObject.selected )
	}
});

noneBut.addEventListener('click', () => {
	disableFreeTransform()
});

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

            ObjGui.disableGUI()
        }

        if ( e.code === 'Delete' ) {
            if ( EditingObject.selected ) {
                deleteObject( EditingObject.selected )

                EditingObject.selected = false

                ObjGui.disableGUI()
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
        ObjGui.updateGUI( obj )
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
        ObjGui.updateGUI( obj )
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
        ObjGui.updateGUI( obj )
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
            ObjGui.updateGUI( EditingObject.selected )
        } else {
            ObjGui.disableGUI()
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
    let property = 'scale'

    data[property][axis] = value

    redrawObject( obj, data )
}
const updateObjectScaleAll = ( obj, scale ) => {
    if ( !obj ) return

    let data = getObjectData( obj )
    let property = 'scale'

    data[property].x = scale.x
    data[property].y = scale.y
    data[property].z = scale.z

    redrawObject( obj, data )
}
const updateObjectPosition = ( obj, position ) => {
    if ( !obj ) return

    let data = getObjectData( obj )

    data.position.x = -position.x
    data.position.y = position.y
    data.position.z = position.z

    redrawObject( obj, data )
}
const updateObjectRotation = ( obj, rotation ) => {
    if ( !obj ) return

    let data = getObjectData( obj )
    let unityQuaternion = MathEx.toUnityQuaternion( rotation.x, rotation.y, rotation.z )

    data.rotation.x = unityQuaternion.x
    data.rotation.y = unityQuaternion.y
    data.rotation.z = unityQuaternion.z
    data.rotation.w = unityQuaternion.w

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
    if ( input.dataset.property.indexOf('scale') !== -1 ) {
        input.addEventListener('focus', e => {
            drawScalingAxisDisplay( EditingObject.selected, input.dataset.property.split('.')[1] )
        })
    }

    input.addEventListener('blur', e => {
        if ( input.dataset.property.indexOf('scale') !== -1 ) {
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

const ObjGui = new ObjectGui();

for (let input of ObjGui.object.numberInputs) {
    if ( !input.classList.contains('auto_exclude') ) {
        handleNumberInput( input )
    }
}

for (let input of ObjGui.object.scaleInputs) {
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

for (let input of ObjGui.object.rotationInputs) {
    input.addEventListener('input', e => {
        let x = MathEx.toRadians(parseFloat(ObjGui.object.rotationX.value))
        let y = MathEx.toRadians(parseFloat(ObjGui.object.rotationY.value))
        let z = MathEx.toRadians(parseFloat(ObjGui.object.rotationZ.value))

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

for (let input of ObjGui.object.toggleInputs) {
    if ( !input.classList.contains('auto_exclude') ) {
        handleToggleInput( input )
    }
}

ObjGui.object.weakToggle.addEventListener('change', e => {
    if (EditingObject.selected) updateObjectWeak( EditingObject.selected, GUI.object.weakToggle.checked )
})

ObjGui.object.unbreakableToggle.addEventListener('change', e => {
    if (EditingObject.selected) updateObjectUnbreakable( EditingObject.selected, GUI.object.unbreakableToggle.checked )
})

GUI.deleteElements = document.querySelectorAll('.delete_selected_object')
for (let el of GUI.deleteElements) {
    el.addEventListener('click', () => {
        if ( EditingObject.selected ) {
            deleteObject( EditingObject.selected )

            EditingObject.selected = false
            ObjGui.disableGUI()
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



// render stuff
const setupDefaultScene = ( controls ) => {
    controls.forward( -420, false ) // haa ha
    controls.truck( -60, false )
    controls.rotate( Math.PI - Math.PI/9, 0, false )

    Sandbox.loadMap( defaultSceneData )
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
    Log_Main.Info("Creating Scene")
    try {
        scene = new THREE.Scene()
    } catch(ex) {
        Log_Main.Error(`Failed to create scene: ${ex.message}`)
    }
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

    AddMenu.updateLists()

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
        Log_FS.Info(`Loading file '${url}'`)
        loader.load( url, obj => {
            let name = url.split('/')[2].split('.')[0]
            resolve( {model: obj, name: name} )
        })
    })
}

loadAsyncWithModelName('assets/models/missing.obj').then((model) => {
    objectGeometry[ `uksandbox.missing` ] = model.model.children[0].geometry
})

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
