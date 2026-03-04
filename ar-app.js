import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let container, camera, scene, renderer, reticle, foodModel;
let hitTestSource = null;
let hitTestSourceRequested = false;

const instructionText = document.getElementById('instruction-text');
const loaderUI = document.getElementById('loader');

const urlParams = new URLSearchParams(window.location.search);
const modelName = urlParams.get('model') || 'hamburger'; 
const modelPath = `models/${modelName}.glb`;

init();
animate();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(2, 5, 2);
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; 
    container.appendChild(renderer.domElement);

    document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
        foodModel = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(foodModel);
        const center = box.getCenter(new THREE.Vector3());
        foodModel.position.sub(center); 
        
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        foodModel.scale.setScalar(0.25 / maxDim); 

        loaderUI.style.display = 'none';
        instructionText.innerText = "Yüzey bulundu. Yerleştirmek için ekrana dokunun.";
    });

    const ringGeo = new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({color: 0xFF5A00}); 
    reticle = new THREE.Mesh(ringGeo, ringMat);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    window.addEventListener('resize', onWindowResize);
}

function onSelect() {
    if (reticle.visible && foodModel) {
        scene.children.forEach(child => {
            if(child.isGroup && child !== foodModel) {
                scene.remove(child);
            }
        });

        const clone = foodModel.clone();
        clone.position.setFromMatrixPosition(reticle.matrix);
        clone.rotation.y = Math.random() * Math.PI;
        scene.add(clone);
        
        instructionText.innerText = "Afiyet olsun! Başka yere taşımak için tekrar dokunun.";
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                    hitTestSource = source;
                });
            });
            session.addEventListener('end', () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
            } else {
                reticle.visible = false;
            }
        }
    }
    renderer.render(scene, camera);
}