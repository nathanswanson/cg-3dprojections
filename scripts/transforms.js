/*– Left: x = z
– Right: x = -z
– Bottom: y = z
– Top: y = -z
– Far: z = -1
– Near: z = zmin
*/

// create a 4x4 matrix to the parallel projection / view matrix
function mat4x4Parallel(prp, srp, vup, clip) {
    
    // 1. translate PRP to origin 


    let n = prp.subtract(srp);
    n.normalize();  

    let u = vup.cross(n);
    u.normalize();

    let v = n.cross(u);
    // 2. rotate VRC such that (u,v,n) align with (x,y,z)

    let VRC = [u,v,n];
    let CW = [(clip[0] + clip[1]) / 2,
            (clip[2] + clip[3]) / 2,
            -clip[4]];
    
    let tPRP = new Matrix(4,4);
    mat4x4Translate(tPRP, -prp.x, -prp.y, -prp.z);
    
    let r = rotateVRC(VRC);

    // 3. shear such that CW is on the z-axis
    let hPar = new Matrix(4,4);
    mat4x4ShearXY(hPar, -(CW[0] / CW[2]), -(CW[1] / CW[2])); 
    
    // 4. translate near clipping plane to origin
    let tPar = new Matrix(4,4);
    mat4x4Translate(tPar, 0, 0, clip[4]);

    // 5. scale such that view volume bounds are ([-1,1], [-1,1], [-1,0])
    let sPar = new Matrix(4,4);
    mat4x4Scale(sPar, 2 /  clip[1] - clip[0], 2 / clip[3] - clip[2], 1 / clip[5]);
    // ...
    let transform = Matrix.multiply([sPar, tPar, hPar, r, tPRP]);
    // Sper * Hpar * T(-PRP) * R * T(-VRP)

    return mat4x4MPar().mult(transform);
    // 1. translate PRP to origin
    // 2. rotate VRC such that (u,v,n) align with (x,y,z)
    // 3. shear such that CW is on the z-axis
    // 4. translate near clipping plane to origin
    // 5. scale such that view volume bounds are ([-1,1], [-1,1], [-1,0])

    // ...
    // let transform = Matrix.multiply([...]);
    // return transform;
}


// create a 4x4 matrix to the perspective projection / view matrix
function mat4x4Perspective(prp, srp, vup, clip) {
    // 1. translate PRP to origin 
  

    let n = prp.subtract(srp);
    n.normalize();  

    let u = vup.cross(n);
    u.normalize();

    let v = n.cross(u);
    // 2. rotate VRC such that (u,v,n) align with (x,y,z)

    let VRC = [u,v,n];
    let CW = [(clip[0] + clip[1]) / 2,
              (clip[2] + clip[3]) / 2,
              -clip[4]];
    
    let tPRP = new Matrix(4,4);
    mat4x4Translate(tPRP, -prp.x, -prp.y, -prp.z);
    
    let r = rotateVRC(VRC);

    // 3. shear such that CW is on the z-axis
    let hPar = new Matrix(4,4);
    mat4x4ShearXY(hPar, -(CW[0] / CW[2]), -(CW[1] / CW[2])); 
    
    // 4. scale such that view volume bounds are ([z,-z], [z,-z], [-1,zmin])
    let sPerX = (2 * clip[4]) / ((clip[1] - clip[0]) * clip[5]); 
    let sPerY = (2 * clip[4]) / ((clip[3] - clip[2]) * clip[5]);
    let sPerZ = 1/clip[5];
    
    let sPer = new Matrix(4,4);
    mat4x4Scale(sPer, sPerX, sPerY, sPerZ);
    // ...
    let transform = Matrix.multiply([sPer, hPar, r, tPRP]);
    // Sper * Hpar * T(-PRP) * R * T(-VRP)

    return mat4x4MPer().mult(transform);
}


function rotateVRC(vecMat) {
    let mat4x4 = new Matrix(4,4);
    mat4x4.values = [[vecMat[0].x, vecMat[0].y, vecMat[0].z, 0],
                     [vecMat[1].x, vecMat[1].y, vecMat[1].z, 0],
                     [vecMat[2].x, vecMat[2].y, vecMat[2].z, 0],
                     [          0,           0,           0, 1]];
    return mat4x4;
}

// create a 4x4 matrix to project a parallel image on the z=0 plane
function mat4x4MPar() {
    let mpar = new Matrix(4, 4);
    mpar.values =  [[1, 0, 0, 0],
                    [0, 1, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 1]];
    return mpar;
}

// create a 4x4 matrix to project a perspective image on the z=-1 plane
function mat4x4MPer() {
    let mper = new Matrix(4, 4);
    mper.values =  [[1, 0,  0, 0],
                    [0, 1,  0, 0],
                    [0, 0,  1, 0],
                    [0, 0, -1, 0]];
    return mper;
}



///////////////////////////////////////////////////////////////////////////////////
// 4x4 Transform Matrices                                                         //
///////////////////////////////////////////////////////////////////////////////////

// set values of existing 4x4 matrix to the identity matrix
function mat4x4Identity(mat4x4) {
    mat4x4.values = [[1, 0, 0, 0],
                     [0, 1, 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the translate matrix
function mat4x4Translate(mat4x4, tx, ty, tz) {
    mat4x4.values = [[1, 0, 0, tx],
                     [0, 1, 0, ty],
                     [0, 0, 1, tz],
                     [0, 0, 0, 1]]; 
}

// set values of existing 4x4 matrix to the scale matrix
function mat4x4Scale(mat4x4, sx, sy, sz) {
    mat4x4.values = [[sx, 0, 0, 0],
                     [0, sy, 0, 0],
                     [0, 0, sz, 0],
                     [0, 0, 0, 1]]; 
}

// set values of existing 4x4 matrix to the rotate about x-axis matrix
function mat4x4RotateX(mat4x4, theta) {
    mat4x4.values = [[1,               0,                0, 0],
                     [0, Math.cos(theta), -Math.sin(theta), 0],
                     [0, Math.sin(theta), Math.cos(theta), 0 ],
                     [0,               0,               0, 1]]; 
}

// set values of existing 4x4 matrix to the rotate about y-axis matrix
function mat4x4RotateY(mat4x4, theta) {
    mat4x4.values = 
        [[Math.cos(theta), 0, Math.sin(theta), 0],
        [0,                1,               0, 0],
        [-Math.sin(theta), 0, Math.cos(theta), 0],
        [0,                0,               0, 1]]; 
}

// set values of existing 4x4 matrix to the rotate about z-axis matrix
function mat4x4RotateZ(mat4x4, theta) {
    mat4x4.values = 
        [[Math.cos(theta), -Math.sin(theta), 0, 0],
        [ Math.sin(theta),  Math.cos(theta), 0, 0],
        [               0,                0, 1, 0],
        [               0,                0, 0, 1]]; 
}

// set values of existing 4x4 matrix to the shear parallel to the xy-plane matrix
function mat4x4ShearXY(mat4x4, shx, shy) {
    
    mat4x4.values = [[1, 0, shx, 0],
                     [0, 1, shy, 0],
                     [0, 0,   1, 0],
                     [0, 0,   0, 1]]; 
}

// create a new 3-component vector with values x,y,z
function Vector3(x, y, z) {
    let vec3 = new Vector(3);
    vec3.values = [x, y, z];
    return vec3;
}

// create a new 4-component vector with values x,y,z,w
function Vector4(x, y, z, w) {
    let vec4 = new Vector(4);
    vec4.values = [x, y, z, w];
    return vec4;
}
