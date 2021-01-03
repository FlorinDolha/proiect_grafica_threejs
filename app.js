import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/FBXLoader.js';

class BasicCharacterControllerProxy{
   constructor(animations){
   this._animations=animations;
   }
   get animations(){
   return this._animations;
   }

};

class BasicCharacterControllerInput {
	constructor() {
	this._Init();
	}
  _Init() {
    this._keys={
      forward:false,
      backward:false,
      left:false,
      right:false,
      shift:false,
    };
    document.addEventListener('keydown',(e)=>this._onKeyDown(e),false);
    document.addEventListener('keyup',(e)=>this._onKeyUp(e),false);
  }
  _onKeyDown(event){
     switch(event.keyCode){
     case 87: //w
     	this._keys.forward=true;
     	break;
     case 65: //a
     	this._keys.left=true;
     	break;
     case 83: //s
     	this._keys.backward=true;
     	break;
     case 68: //d
     	this._keys.right=true;
     	break;
     case 16: //shift
     	this._keys.shift=true;
     	break;
  };
  }
    _onKeyUp(event){
     switch(event.keyCode){
     case 87: //w
     	this._keys.forward=false;
     	break;
     case 65: //a
     	this._keys.left=false;
     	break;
     case 83: //s
     	this._keys.backward=false;
     	break;
     case 68: //d
     	this._keys.right=false;
     	break;
     case 16: //shift
     	this._keys.shift=false;
     	break;
  };
}
};



class BasicGirlController {
  constructor(params){
    this._Init(params);
  }
  _Init(params){
    this._params=params;
    this._decceleration= new THREE.Vector3(-0.0005,-0.0001,-5.0);
    this._acceleration=new THREE.Vector3(1,0.25,100.0);
    this._velocity=new THREE.Vector3(0,0,0);
    this._animations={};
    this._input=new BasicCharacterControllerInput();
    this._fsm=new GirlFSM(new BasicCharacterControllerProxy(this._animations));
    this._LoadAnimatedModel();
   }
  _LoadAnimatedModel(){
    const loader=new FBXLoader();
    loader.setPath('./resources/');
    loader.load(this._params.name, (fbx) => {
    	fbx.scale.setScalar(0.1);
    	fbx.traverse(c=>{
    	   c.castShadow=true;
    	   });
      this._target=fbx;
      fbx.position.x = 20;
    	this._params.scene.add(this._target);
    	this._mixer=new THREE.AnimationMixer(this._target);
    	this._manager=new THREE.LoadingManager();
    	this._manager.onLoad=()=>{
    	   this._fsm.SetState('dance');
    	};
    	const _OnLoad=(animName,anim)=>{
    	   anim.timeScale=1/5;
           const clip=anim.animations[0];
           const action=this._mixer.clipAction(clip);
           this._animations[animName]={
           clip:clip,
           action:action,
           };
        };
        const loader=new FBXLoader(this._manager);
        loader.setPath('./resources/');
          loader.load('dance.fbx',(a) => {_OnLoad('dance',a);});
        // loader.load('Running.fbx',(a)=>{_OnLoad('sprint',a);});
        // loader.load('Walking.fbx',(a)=>{_OnLoad('walk',a);});
        // loader.load('Idle.fbx',(a)=>{_OnLoad('idle',a);});
    });
  }
  Update(timeInSeconds){
  if(this._mixer){
    this._mixer.update(timeInSeconds);
  }
}
};



class FiniteStateMachine {
   constructor() {
    this._states={};
    this._currentState=null;
   }
   _AddState(name,type) {
     this._states[name]=type;
   }
   SetState(name){
     const prevState=this._currentState;
     if(prevState) {
       if(prevState.Name==name) {
          return;
       }
       prevState.Exit();
     }
     const state=new this._states[name](this);
     this._currentState=state;
     state.Enter(prevState);
     }
     Update(timeElapsed,input){
     if (this._currentState){
     	this._currentState.Update(timeElapsed,input);
     }
     }
};


class GirlFSM extends FiniteStateMachine {
     constructor(proxy){
     super();
     this._proxy=proxy;
     this._Init();
     }
     _Init(){
       this._AddState('dance',danceState);
       
     }
};



class State{
  constructor(parent){
  	this._parent=parent;
  }
  Enter(){}
  Exit(){}
  Update(){}
};

class danceState extends State {
  constructor(parent){
    super(parent);
    }
    get Name(){
       return 'dance';
    }
    Enter(prevState){
      const currentAction = this._parent._proxy._animations['dance'].action;
      currentAction.time = 0.0;
      currentAction.setEffectiveTimeScale(1.0);
      currentAction.setEffectiveWeight(1.0);
      currentAction.play();
    }
}

class SprintState extends State{
      constructor(parent){
      super(parent);
      }
      get Name(){
      	 return 'sprint';
      }
      Enter(prevState){
       const curAction=this._parent._proxy._animations['sprint'].action;
       if(prevState) {
        const prevActions=this._parent._proxy._animations[prevState.Name].action;
        curAction.enabled=true;
        if(prevState.Name=='walk'){
          const ratio=curAction.getClip().duration/prevActions.getClip().duration;
          curAction.time=prevActions.time*ratio;
          }
         else{
          curAction.time=0.0;
          curAction.setEffectiveTimeScale(0.2);
          curAction.setEffectiveWeight(1.0);
          }
          curAction.crossFadeFrom(prevActions,0.5,true);
          curAction.play();
          }
          else{
          curAction.play();
       }
    }
    Exit(){}
    Update(timeElapsed,input){
    	if(input._keys.forward||input._keys.backward){
    	  if(!input._keys.shift){
    	   this._parent.SetState('walk');
    	   }
    	   return;
    	}
    	this._parent.SetState('idle');
    }
};


class WalkState extends State{
      constructor(parent){
      super(parent);
      }
      get Name(){
      	 return 'walk';
      }
      Enter(prevState){
       const curAction=this._parent._proxy._animations['walk'].action;
       if(prevState) {
        const prevActions=this._parent._proxy._animations[prevState.Name].action;
        curAction.enabled=true;
        if(prevState.Name=='walk'){
          const ratio=curAction.getClip().duration/prevActions.getClip().duration;
          curAction.time=prevActions.time*ratio;
          }
         else{
          curAction.time=0.0;
          curAction.setEffectiveTimeScale(1.0);
          curAction.setEffectiveWeight(1.0);
          }
          curAction.crossFadeFrom(prevActions,0.5,true);
          curAction.play();
          }
          else{
          curAction.play();
       }
    }
    Exit(){}
    Update(timeElapsed,input){
    	if(input._keys.forward||input._keys.backward){
    	  if(input._keys.shift){
    	   this._parent.SetState('sprint');
    	   }
    	   return;
    	}
    	this._parent.SetState('idle');
    }
};


class IdleState extends State{
      constructor(parent){
      super(parent);
      }
      get Name(){
      	 return 'idle';
      }
      Enter(prevState){
       const curAction=this._parent._proxy._animations['idle'].action;
       if(prevState) {
        const prevActions=this._parent._proxy._animations[prevState.Name].action;
	curAction.time=0.0;
	curAction.enabled=true;
	curAction.setEffectiveTimeScale(1.0);
	curAction.setEffectiveWeight(1.0);
	curAction.crossFadeFrom(prevActions,0.5,true);
	curAction.play();
       }
       else{
       curAction.play();
       }
    }
    Exit(){}
    Update(_,input){
    	if(input._keys.forward||input._keys.backward){
    	   this._parent.SetState('walk');
    	   }
    }
};

class BasicWorldDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener(
      'resize',
      () => {
        this._OnWindowResize();
      },
      false
    );

    const fov = 45;
    let container;
    container=document.querySelector('.scene');
    container.appendChild(this._threejs.domElement);
    const aspect = container.clientWidth/container.clientHeight;
    const near = 1.0;
    const far = 200.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(0, 0, -40);

    this._scene = new THREE.Scene();

    let light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(20, 100, 10);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    light = new THREE.AmbientLight(0x101010);
    this._scene.add(light);

    const controls = new OrbitControls(this._camera, this._threejs.domElement);
    controls.target.set(0, 10, 0);
    controls.update();

    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      './resources/skybox3_px.jpg',
      './resources/skybox3_nx.jpg',
      './resources/skybox3_py.jpg',
      './resources/skybox3_ny.jpg',
      './resources/skybox3_pz.jpg',
      './resources/skybox3_nz.jpg',
    ]);
    this._scene.background = texture;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100, 10, 100),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
      })
    );
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
      })
    );
    box.position.set(0, 1, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    //this._scene.add(box);

    for (let x = -8; x < 8; x++) {
      for (let y = -8; y < 8; y++) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(2, 2, 2),
          new THREE.MeshStandardMaterial({
            color: 0x808080,
          })
        );
        box.position.set(
          Math.random() + x * 5,
          Math.random() * 4.0 + 2.0,
          Math.random() + y * 5
        );
        box.castShadow = true;
        box.receiveShadow = true;
        //this._scene.add(box);
      }
    }

    // const box = new THREE.Mesh(
    //   new THREE.SphereGeometry(2, 32, 32),
    //   new THREE.MeshStandardMaterial({
    //       color: 0xFFFFFF,
    //       wireframe: true,
    //       wireframeLinewidth: 4,
    //   }));
    // box.position.set(0, 0, 0);
    // box.castShadow = true;
    // box.receiveShadow = true;
    // this._scene.add(box);

    this._LoadAnimatedModelAndDance();
    this._RAF();
  }
  _LoadAnimatedModelAndDance(){
     const params={
       camera:this._camera,
       scene:this._scene,
       name:'girl.fbx',
       animation:1,
       animationName:['dance'],
       animationFile:['dance.fbx']
     }
     this._girl=new BasicGirlController(params);
  }
  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if(this._previousRAF===null){
         this._previousRAF = t;
      }
      this._RAF();
      this._threejs.render(this._scene,this._camera);
      this._Step(t-this._previousRAF);
      this._previousRAF=t;
    });
  }
  _Step(timeElapsed){
    const timeElapsedS=timeElapsed*0.001;
    if(this._mixers){
      this._mixers.map(m=>m.update(timeElapsedS));
  }
   if(this._girl){
   this._girl.Update(timeElapsedS);
   }
}
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new BasicWorldDemo();
});
