import * as THREE from 'three';
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

const convertFromUnityQuaternion = ( x, y, z, w ) => {
    let quaternion = new THREE.Quaternion( -x, y, z, -w )
    let v = new THREE.Euler()

    v.setFromQuaternion( quaternion )
    v.y += Math.PI
    v.z *= -1

    return v
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
}
const addBlock = ( scene, blockData ) => {
    let geometry = new THREE.BoxGeometry( blockData.BlockSize.x, blockData.BlockSize.y, blockData.BlockSize.z )

    let solid = new THREE.MeshLambertMaterial( objectMaterials[ blockData.ObjectIdentifier ] )
    let frame = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.4 })

    let blockSolid = new THREE.Mesh( geometry, solid )
    let blockFrame = new THREE.Mesh( geometry, frame )

    blockSolid.userData.objectData = blockData
    blockSolid.userData.objectType = 'block'
    
    for ( let cube of [ blockSolid, blockFrame ] ) {
        cube.position.set( blockData.BlockSize.x/2, blockData.BlockSize.y/2, -blockData.BlockSize.z/2 )
    }

    let blockGroup = new THREE.Group()
    blockGroup.add( blockSolid )
    blockGroup.add( blockFrame )

    let euler = convertFromUnityQuaternion( blockData.Rotation.x, blockData.Rotation.y, blockData.Rotation.z, blockData.Rotation.w )
    
    blockGroup.position.set( -blockData.Position.x, blockData.Position.y, blockData.Position.z )
    blockGroup.rotation.copy( euler )

    blockSolid.userData.parentGroup = blockGroup
    blockSolid.userData.drawFunc = addBlock

    scene.add( blockGroup )

    return blockSolid
}
const addRamp = ( scene, propData ) => {
    let shape = new THREE.Shape()

    shape.moveTo( 0,  0 ) 
    shape.lineTo( 4,  0 )
    shape.lineTo( 0,  4 )
    shape.lineTo( 0,  0 )

    let geometry = new THREE.ExtrudeGeometry( shape, { depth: 4, bevelEnabled: false } )

    let solid = new THREE.MeshLambertMaterial( objectMaterials[ propData.ObjectIdentifier ] )
    let frame = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.4 })

    let rampSolid = new THREE.Mesh( geometry, solid )
    let rampFrame = new THREE.Mesh( geometry, frame )

    rampSolid.userData.objectData = propData
    rampSolid.userData.objectType = 'prop'

    for ( let ramp of [ rampSolid, rampFrame ] ) {
        ramp.position.set(2, -2, 0)
        ramp.rotation.set(-Math.PI/2, -Math.PI/2, 0)
    }

    let rampScaleGroup = new THREE.Group()
    rampScaleGroup.add( rampSolid )
    rampScaleGroup.add( rampFrame )

    rampScaleGroup.scale.set( propData.Scale.x, propData.Scale.y, propData.Scale.z )

    let rampGroup = new THREE.Group()
    rampGroup.add( rampScaleGroup )

    let euler = convertFromUnityQuaternion( propData.Rotation.x, propData.Rotation.y, propData.Rotation.z, propData.Rotation.w )

    rampGroup.position.set( -propData.Position.x, propData.Position.y, propData.Position.z )
    rampGroup.rotation.copy( euler )

    rampSolid.userData.parentGroup = rampGroup
    rampSolid.userData.drawFunc = addRamp

    scene.add( rampGroup )

    return rampSolid
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

document.addEventListener('keydown', e => {
    if ( document.activeElement.tagName !== 'INPUT' ) {
        KeyPressed[e.code] = true

        e.preventDefault()
        e.stopPropagation()

        if ( e.code === 'Escape' ) {
            updateSelectedState( EditingObject.selected, false )

            EditingObject.selected = false

            disableGUI()
        }

        if ( e.code === 'Delete' ) {
            if ( EditingObject.selected ) {
                deleteObject( EditingObject.selected )

                EditingObject.selected = false

                disableGUI()
            }
        }
    }
})
document.addEventListener('keyup', e => {
    if ( document.activeElement.tagName !== 'INPUT' ) {
        KeyPressed[e.code] = false
        
        e.preventDefault()
        e.stopPropagation()
    }
})

// mouse controls
const Mouse = {
    vector: new THREE.Vector2(),
    raycaster: new THREE.Raycaster()
}

const getIntersectingObject = ( scene ) => {
    Mouse.raycaster.setFromCamera( Mouse.vector, camera )
    let intersects = Mouse.raycaster.intersectObjects( scene.children )
    let mesh

    if ( intersects.length >= 2 ) {
        for ( let i=0; i<2; i++ ) {
            if ( intersects[i].object.userData.objectData ) mesh = intersects[i]
        }
    }
    
    return mesh || false
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
    if ( obj.userData.selectedState ) emissiveColor = 0xffff00

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
}

const handleMouseMove = ( e ) => {
    Mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    Mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

    Mouse.vector.x = Mouse.x
    Mouse.vector.y = Mouse.y

    updateHoveredObject( getIntersectingObject( scene ) )
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
    if ( document.elementFromPoint( e.clientX, e.clientY ).tagName !== 'CANVAS' ) {
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

const redrawObject = ( obj, newData ) => {
    let oldData = obj.userData.objectData

    disposeGroup( obj.userData.parentGroup )
    
    let redrawnObject = obj.userData.drawFunc( scene, newData )
    EditingObject.selected = redrawnObject
    updateSelectedState( EditingObject.selected, true )

    Sandbox.updateObject( obj.userData.objectType, oldData, newData )
}

const deleteObject = ( obj ) => {
    Sandbox.removeObject( obj.userData.objectType, obj.userData.objectData )

    disposeGroup( obj.userData.parentGroup )
}

// gooey
const handleNumberInput = (input) => {
    input.addEventListener('input', e => {
        if (EditingObject.selected) updateObjectProperty( EditingObject.selected, input.dataset.property, parseFloat(input.value) )
    })    
}
const handleToggleInput = (input) => {
    input.addEventListener('input', e => {
        if (EditingObject.selected) updateObjectProperty( EditingObject.selected, input.dataset.property, input.checked )
        // console.log('a')
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
            updateBlockGUI( getObjectData(obj) )
            break
        case 'prop':
            updatePropGUI( getObjectData(obj) )
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
GUI.block = {}
GUI.block.element = document.getElementById('block_data')

const updateBlockGUI = ( data ) => {
    if (!data) return

    GUI.block.element.classList.remove('hidden')

    GUI.block.element.querySelector('#block_type').innerText = data.ObjectIdentifier

    let posInputs = Array.from( GUI.block.element.querySelectorAll('#position input') )
    posInputs[0].value = data.Position.x
    posInputs[1].value = data.Position.y
    posInputs[2].value = data.Position.z

    let scaleInputs = Array.from( GUI.block.element.querySelectorAll('#scale input') )
    scaleInputs[0].value = data.BlockSize.x
    scaleInputs[1].value = data.BlockSize.y
    scaleInputs[2].value = data.BlockSize.z

    let frozenInput = GUI.block.element.querySelector('#block_frozen')
    frozenInput.checked = data.Kinematic

    let weakInput = GUI.block.weakToggle
    let unbreakableInput = GUI.block.unbreakableToggle

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

GUI.block.numberInputs = GUI.block.element.querySelectorAll('input[type="number"]')
for (let input of GUI.block.numberInputs) {
    handleNumberInput( input )
}

GUI.block.toggleInputs = GUI.block.element.querySelectorAll('input[type="checkbox"]')
for (let input of GUI.block.toggleInputs) {
    if ( !input.classList.contains('auto_exclude') ) {
        handleToggleInput( input )
    }
}

GUI.block.weakToggle = GUI.block.element.querySelector('#block_weak')
GUI.block.weakToggle.addEventListener('change', e => {
    if (EditingObject.selected) updateObjectWeak( EditingObject.selected, GUI.block.weakToggle.checked )
})

GUI.block.unbreakableToggle = GUI.block.element.querySelector('#block_unbreakable')
GUI.block.unbreakableToggle.addEventListener('change', e => {
    if (EditingObject.selected) updateObjectUnbreakable( EditingObject.selected, GUI.block.unbreakableToggle.checked )
})

// prop (i think this is basically the exact same setup as the block gui oops)
GUI.prop = {}
GUI.prop.element = document.getElementById('prop_data')

const updatePropGUI = ( data ) => {
    if (!data) return

    GUI.prop.element.classList.remove('hidden')

    GUI.prop.element.querySelector('#prop_type').innerText = data.ObjectIdentifier

    let posInputs = Array.from( GUI.prop.element.querySelectorAll('#position input') )
    posInputs[0].value = data.Position.x
    posInputs[1].value = data.Position.y
    posInputs[2].value = data.Position.z

    let scaleInputs = Array.from( GUI.prop.element.querySelectorAll('#scale input') )
    scaleInputs[0].value = data.Scale.x
    scaleInputs[1].value = data.Scale.y
    scaleInputs[2].value = data.Scale.z

    let frozenInput = GUI.prop.element.querySelector('#prop_frozen')
    frozenInput.checked = data.Kinematic

    let weakInput = GUI.prop.weakToggle
    let unbreakableInput = GUI.prop.unbreakableToggle

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

GUI.prop.numberInputs = GUI.prop.element.querySelectorAll('input[type="number"]')
for (let input of GUI.prop.numberInputs) {
    handleNumberInput( input )
}

GUI.prop.toggleInputs = GUI.prop.element.querySelectorAll('input[type="checkbox"]')
for (let input of GUI.prop.toggleInputs) {
    handleToggleInput( input )
}

GUI.prop.weakToggle = GUI.prop.element.querySelector('#prop_weak')
GUI.prop.weakToggle.addEventListener('change', e => {
    if (EditingObject.selected) updateObjectWeak( EditingObject.selected, GUI.prop.weakToggle.checked )
})

GUI.prop.unbreakableToggle = GUI.prop.element.querySelector('#prop_unbreakable')
GUI.prop.unbreakableToggle.addEventListener('change', e => {
    if (EditingObject.selected) updateObjectUnbreakable( EditingObject.selected, GUI.prop.unbreakableToggle.checked )
})

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
    controls.forward( -320, false )
    controls.truck( -65, false )

    Sandbox.loadMap( JSON.parse(defaultSceneData) )
    reloadScene( scene )
}

const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize( window.innerWidth, window.innerHeight )
}

const init = () => {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 )

    addLights( scene )

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
}
const update = () => {
    // controls.update()
    let delta = clock.getDelta()

    // keyboard camera movement
    if (KeyPressed.KeyW) controls.forward( Prefs.getMoveSpeed() * delta, false )
    if (KeyPressed.KeyS) controls.forward( -Prefs.getMoveSpeed() * delta, false ) 
    if (KeyPressed.KeyD) controls.truck(  Prefs.getMoveSpeed() * delta, false ) 
    if (KeyPressed.KeyA) controls.truck( -Prefs.getMoveSpeed() * delta, false ) 
    if (KeyPressed.KeyE) controls.elevate(  Prefs.getMoveSpeed() * delta, false ) 
    if (KeyPressed.KeyQ) controls.elevate( -Prefs.getMoveSpeed() * delta, false ) 

    controls.update( delta )

    renderer.render( scene, camera )

    requestAnimationFrame( update )
}

init()
update()