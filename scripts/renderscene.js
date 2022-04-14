let view;
let ctx;
let scene;
let start_time;

const LEFT =   32; // binary 100000
const RIGHT =  16; // binary 010000
const BOTTOM = 8;  // binary 001000
const TOP =    4;  // binary 000100
const FAR =    2;  // binary 000010
const NEAR =   1;  // binary 000001
const FLOAT_EPSILON = 0.000001;

let time = 0;

// Initialization function - called when web page loads
function init() {
    let w = 800;
    let h = 600;
    view = document.getElementById('view');
    view.width = w;
    view.height = h;

    ctx = view.getContext('2d');
    // initial scene... feel free to change this
    scene = {
        view: {
            type: 'perspective',
            prp: Vector3(0, 10, -50),
            srp: Vector3(0, 1, 0),
            vup: Vector3(0, 1, 0),
            clip: [-12, 6, -12, 6, 10, 100]
        },
        models: [
            {
                type: 'generic',
                vertices: [
                    Vector4( 0,  0, 0, 1),
                    Vector4(20,  0, 0, 1),
                    Vector4(20, 12, 0, 1),
                    Vector4(10, 20, 0, 1),
                    Vector4( 0, 12, 0, 1),
                    Vector4( 0,  0, -30, 1),
                    Vector4(20,  0, -30, 1),
                    Vector4(20, 12, -30, 1),
                    Vector4(10, 20, -30, 1),
                    Vector4( 0, 12, -30, 1)
                ],
                edges: [
                    [0, 1, 2, 3, 4, 0],
                    [5, 6, 7, 8, 9, 5],
                    [0, 5],
                    [1, 6],
                    [2, 7],
                    [3, 8],
                    [4, 9]
                ],
                animation: {
                    axis: "y",
                    rps: 0.2
                },
                matrix: new Matrix(4, 4)
            },
            {
                type: 'cube',
                center: [30, 0, 0],
                width: 3,
                height: 3,
                depth: 3
            },
            {
                type: 'sphere',
                center: [-30, 0, 0],
                radius: 15,
                slices: 30,
                stacks: 30,
                animation: {
                    axis: "x",
                    rps: 0.5
                },
            },
            {
                type: 'cone',
                center: [0, -20, -20],
                radius: 3,
                height: 10,
                sides: 10,
                animation: {
                    axis: "y",
                    rps: 1
                },
            },
            {
                type: 'cylinder',
                center: [45, 0, -60],
                radius: 5,
                height: 5,
                sides: 100,
                animation: {
                    axis: "y",
                    rps: 0.01
                },
            
            }
        ]
    };

    // event handler for pressing arrow keys
    document.addEventListener('keydown', onKeyDown, false);
    scene.models.forEach(model => {
        if(model.vertices === undefined) {
            model.vertices = [];
            model.edges = [];
        }

        switch(model.type) {
            case "cube": 
                drawCube(model);
                break;
            case "cylinder": 
                drawCylinder(model);
                break;
            case "cone":
                drawCone(model);
                break;
            case "sphere":
                drawSphere(model);
                break;
        }
    
    });


    // start animation loop
    start_time = performance.now(); // current timestamp in milliseconds
    window.requestAnimationFrame(animate);
}

// Animation loop - repeatedly calls rendering code
function animate(timestamp) {
    // step 1: calculate time (time since start)
    time = timestamp - time;
    
    // step 2: transform models based on time
    for(let model of scene.models) {
        if(model["animation"] !== undefined) {
            if(model["theta"] == undefined)
                model["theta"] = 0;
            model["theta"] = model["animation"].rps * time / 180;
        }
    }
    time = timestamp;

    // step 3: draw scene
    ctx.clearRect(0,0, view.width, view.height);
    drawScene();
    
    // step 4: request next animation frame (recursively calling same function)
    // (may want to leave commented out while debugging initially)

    window.requestAnimationFrame(animate);
}

// Main drawing code - use information contained in variable `scene`
function drawScene() {
    
    // For each model, for each edge
    //  * transform to canonical view volume
    let viewPlane;
    if(scene.view.type == "perspective") {
        viewPlane = mat4x4Perspective(scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
    } else {
        viewPlane = mat4x4Parallel(scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
    }
    //  * clip in 3D
    //  * project to 2D
    let zmin = -(scene.view.clip[4] / scene.view.clip[5]);
    for(let modelIdx = 0; modelIdx < scene.models.length; modelIdx++) {
        let model = scene.models[modelIdx];
        drawGeneric(model, viewPlane); 
    }
}

function drawCylinder(model) {
    let radiusH = model.height / 2;
    let btmCenter = [model.center[0], model.center[1], model.center[2] - radiusH];
    let topCenter = [model.center[0] , model.center[1], model.center[2]+ radiusH]; 
    createVec3ArrCircle(model, model.sides, model.radius, btmCenter, 0);
    createVec3ArrCircle(model, model.sides, model.radius, topCenter, model.sides + 1);
    //stitch
    for(let i = 0; i < model.sides; i++) {
        model.edges.push([i,i+model.sides+1])
    }

}

function drawCone(model) {
    let radiusH = model.height / 2;
    let btmCenter = [model.center[0], model.center[1], model.center[2] - radiusH];
    createVec3ArrCircle(model, model.sides, model.radius, btmCenter, 0);
    model.vertices.push(new Vector4(model.center[0], model.center[1], model.center[2] + radiusH, 1))//point
    for(let i = 0; i < model.sides; i++) {
        model.edges.push([i, model.sides+1]);
    }

}

function drawSphere(model) {
    let bottomZ = model.center[2] - (model.radius)
    let lineSpace = (model.radius * 2)  / (model.slices - 1)
    let edgeCount = 0;
    for(let i = 0; i < model.slices; i++) {
        let deltaCenter = bottomZ + ((lineSpace * (i)));
        
        let centerSlice = [model.center[0], model.center[1], deltaCenter];
        let sliceRadius = Math.sqrt(model.radius**2 - (Math.abs(model.center[2] - deltaCenter))**2);
        if(isNaN(sliceRadius))
            sliceRadius = 0;
        createVec3ArrCircle(model, model.slices, sliceRadius, centerSlice, edgeCount);
        edgeCount+=model.slices + 1;
        
        centerSlice = [model.center[0], deltaCenter, model.center[2]];
        sliceRadius = Math.sqrt(model.radius**2 - (Math.abs(model.center[1] - deltaCenter))**2);

        createVec3ArrCircle(model, model.slices, sliceRadius, centerSlice, edgeCount, true);
        edgeCount+=model.stacks + 1;
    }
}

function createVec3ArrCircle(model, count, radius, center, startIdx, rotate=false) {
    var degreePer = 360 / count;
    model.edges.push([]);
    let secondIdx = 1;
    for(let i = 0; i <= count; i++) {
        
        if(!rotate) {
            let x = center[0] + (radius * Math.cos(i * degreePer * (Math.PI / 180)));
            let y = center[1] + (radius * Math.sin(i * degreePer * (Math.PI / 180)));
            model.vertices.push(new Vector4(x,y,center[2], 1));
        } else {
            let x = center[0] + (radius * Math.cos(i * degreePer * (Math.PI / 180)));
            let z = center[2] + (radius * Math.sin(i * degreePer * (Math.PI / 180)));
            model.vertices.push(new Vector4(x,center[1],z, 1));
        }
      
        model.edges[model.edges.length -1].push(i + startIdx);
    }
    model.edges.push(0);
}

function drawCube(model) {
    let radiusW = model.width / 2;
    let radiusH = model.height / 2;
    let radiusD = model.depth / 2;
    model["vertices"] = [
        Vector4( model.center[0] - radiusW,  model.center[1] + radiusH, model.center[2] + radiusD, 1), 
        Vector4( model.center[0] - radiusW,  model.center[1] - radiusH, model.center[2] + radiusD, 1), 
        Vector4( model.center[0] - radiusW,  model.center[1] + radiusH, model.center[2] - radiusD, 1), 
        Vector4( model.center[0] - radiusW,  model.center[1] - radiusH, model.center[2] - radiusD, 1), 
        Vector4( model.center[0] + radiusW,  model.center[1] + radiusH, model.center[2] + radiusD, 1), 
        Vector4( model.center[0] + radiusW,  model.center[1] - radiusH, model.center[2] + radiusD, 1), 
        Vector4( model.center[0] + radiusW,  model.center[1] + radiusH, model.center[2] - radiusD, 1), 
        Vector4( model.center[0] + radiusW,  model.center[1] - radiusH, model.center[2] - radiusD, 1), 

    ]
    model["edges"] = [
            [0,1,3,2,0],
            [4,5,7,6,4],
            [0, 4],
            [1, 5],
            [2, 6],
            [3, 7],
        ]

}

function drawGeneric(model, viewPlane) {
    if(model["theta"] !== undefined) {
        for(let vertIdx = 0; vertIdx < model["vertices"].length; vertIdx++) {
            let rotation = new Matrix(4,4);
            switch(model.animation.axis) {
                case "x":
                    mat4x4RotateX(rotation, model.theta)
                    break;
                case "y":
                    mat4x4RotateY(rotation, model.theta)
                    break;
                case "z":
                    mat4x4RotateZ(rotation, model.theta)
                    break;
            }
            model.vertices[vertIdx] = rotation.mult(model.vertices[vertIdx]);
        }
    }

    for(let entry = 0; entry < model.edges.length; entry++) {
        let edgeList = model.edges[entry];
        for(let edgeIdx = 0; edgeIdx < edgeList.length - 1; edgeIdx++) {
            let edge = edgeList[edgeIdx];
            let edgeNext = edgeList[edgeIdx+1]
            let transformPt0 = viewPlane.mult(model.vertices[edge]).data;
            let transformPt1 = viewPlane.mult(model.vertices[edgeNext]).data;
            let pt0 = {x: transformPt0[0] / transformPt0[3], y: transformPt0[1] / transformPt0[3]};
            let pt1 = {x: transformPt1[0] / transformPt1[3], y: transformPt1[1] / transformPt1[3]};
            drawLine(pt0.x * view.width, pt0.y * view.height, pt1.x * view.width, pt1.y * view.height);
        }
    }
}

// Get outcode for vertex (parallel view volume)
function outcodeParallel(vertex) {
    let outcode = 0; 
    if (vertex.x < (-1.0 - FLOAT_EPSILON)) {
        outcode += LEFT;
    }
    else if (vertex.x > (1.0 + FLOAT_EPSILON)) {
        outcode += RIGHT;
    }
    if (vertex.y < (-1.0 - FLOAT_EPSILON)) {
        outcode += BOTTOM;
    }
    else if (vertex.y > (1.0 + FLOAT_EPSILON)) {
        outcode += TOP;
    }
    if (vertex.z < (-1.0 - FLOAT_EPSILON)) {
        outcode += FAR;
    }
    else if (vertex.z > (0.0 + FLOAT_EPSILON)) {
        outcode += NEAR;
    }
    return outcode;
}

// Get outcode for vertex (perspective view volume)
function outcodePerspective(vertex, z_min) {
    let outcode = 0;
    if (vertex.x < (vertex.z - FLOAT_EPSILON)) {
        outcode += LEFT;
    }
    else if (vertex.x > (-vertex.z + FLOAT_EPSILON)) {
        outcode += RIGHT;
    }
    if (vertex.y < (vertex.z - FLOAT_EPSILON)) {
        outcode += BOTTOM;
    }
    else if (vertex.y > (-vertex.z + FLOAT_EPSILON)) {
        outcode += TOP;
    }
    if (vertex.z < (-1.0 - FLOAT_EPSILON)) {
        outcode += FAR;
    }
    else if (vertex.z > (z_min + FLOAT_EPSILON)) {
        outcode += NEAR;
    }
    return outcode;
}
/*
Left: x = -1
– Right: x = 1
– Bottom: y = -1
– Top: y = 1
– Far: z = -1
– Near: z = 0
*/
// Clip line - should either return a new line (with two endpoints inside view volume) or null (if line is completely outside view volume)
function clipLineParallel(line) {
    let result = null;
    let p0 = Vector3(line.pt0.x, line.pt0.y, line.pt0.z); 
    let p1 = Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
    let out0 = outcodeParallel(p0);
    let out1 = outcodeParallel(p1);
    
    // TODO: implement clipping here!
    return result;
}

// Clip line - should either return a new line (with two endpoints inside view volume) or null (if line is completely outside view volume)
function clipLinePerspective(line, z_min) {

    let result = null;
    let p0 = Vector3(line.pt0.x, line.pt0.y, line.pt0.z); 
    let p1 = Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
    let out0 = outcodePerspective(p0, z_min);
    let out1 = outcodePerspective(p1, z_min);
    // TODO: implement clipping here!
    
    return result;
}

// Called when user presses a key on the keyboard down 
function onKeyDown(event) {
    switch (event.keyCode) {
        case 37: // LEFT Arrow
            console.log("left");
            //scene.view.srp.y+=1;
            let n = scene.view.prp.subtract(scene.view.srp);
            let srp4 = new Vector4(n.x, n.y ,n.z, 1)
            let rotationMatrix = new Matrix(4,4);
            mat4x4RotateY(rotationMatrix,1); 
            srp4 = rotationMatrix.mult(srp4).data;
            scene.view.srp = new Vector3(srp4[0],srp4[1],srp4[2]);
            break;
        case 39: // RIGHT Arrow
            console.log("right");
            scene.view.srp.y-=1;
            break;
        case 65: // A key
            console.log("A");
            scene.view.prp.x+=1;
            scene.view.srp.x+=1;
            break;
        case 68: // D key
            console.log("D");
            scene.view.prp.x-=1;
            scene.view.srp.x-=1;
            break;
        case 83: // S key
            console.log("S");
            scene.view.prp.z+=1;
            scene.view.srp.z+=1;
            break;
        case 87: // W key
            console.log("W");
            scene.view.prp.z-=1;
            scene.view.srp.z-=1;
            break;
    }
}

///////////////////////////////////////////////////////////////////////////
// No need to edit functions beyond this point
///////////////////////////////////////////////////////////////////////////

// Called when user selects a new scene JSON file
function loadNewScene() {
    let scene_file = document.getElementById('scene_file');


    let reader = new FileReader();
    reader.onload = (event) => {
        scene = JSON.parse(event.target.result);
        scene.view.prp = Vector3(scene.view.prp[0], scene.view.prp[1], scene.view.prp[2]);
        scene.view.srp = Vector3(scene.view.srp[0], scene.view.srp[1], scene.view.srp[2]);
        scene.view.vup = Vector3(scene.view.vup[0], scene.view.vup[1], scene.view.vup[2]);

        for (let i = 0; i < scene.models.length; i++) {
            if (scene.models[i].type === 'generic') {
                for (let j = 0; j < scene.models[i].vertices.length; j++) {
                    scene.models[i].vertices[j] = Vector4(scene.models[i].vertices[j][0],
                                                          scene.models[i].vertices[j][1],
                                                          scene.models[i].vertices[j][2],
                                                          1);
                }
            }
            else {
                scene.models[i].center = Vector4(scene.models[i].center[0],
                                                 scene.models[i].center[1],
                                                 scene.models[i].center[2],
                                                 1);
            }
            scene.models[i].matrix = new Matrix(4, 4);
        }
    };
    reader.readAsText(scene_file.files[0], 'UTF-8');
}

// Draw black 2D line with red endpoints 
function drawLine(x1, y1, x2, y2) {
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    ctx.fillRect(x2 - 2, y2 - 2, 4, 4);
}
