import particle from '../textures/particle.png';
import { hasVisualValue } from "./util";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBJLoader } from "./OBJLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader";
import ModelFactory from '@metacell/geppetto-meta-core/ModelFactory';
import Resources from '@metacell/geppetto-meta-core/Resources';


export default class MeshFactory {
  constructor (
    scene,
    linesThreshold = 2000,
    depthWrite = true,
    linePrecisionMinRadius = 300,
    minAllowedLinePrecision = 1,
    particleTexture,
    dracoDecoderPath,
    THREE
  ) {
    this.scene = scene;
    this.depthWrite = depthWrite;
    this.meshes = {};
    this.splitMeshes = {};
    this.visualModelMap = {};
    this.connectionLines = {};
    this.complexity = 0;
    this.sceneMaxRadius = 0;
    this.linePrecisionMinRadius = linePrecisionMinRadius;
    this.minAllowedLinePrecision = minAllowedLinePrecision;
    this.linesThreshold = linesThreshold;
    this.particleTexture = particleTexture;
    this.dracoDecoderPath = dracoDecoderPath ? dracoDecoderPath : 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/'
    this.THREE = THREE ? THREE : require('three');
    this.THREE.Cache.enabled = true;
    this.setupLoaders();
    this.instancesMap = new Map();
  }

  setupLoaders (){
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(this.dracoDecoderPath);

    const manager = new this.THREE.LoadingManager();
    manager.onProgress = function (item, loaded, total) {
      console.log(item, loaded, total);
    };
    const objLoader = new OBJLoader(manager);

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader( dracoLoader );

    this.loaders = {
      [Resources.GLTF]: gltfLoader,
      [Resources.DRC]: dracoLoader,
      [Resources.OBJ]: objLoader,
      [Resources.COLLADA]: new ColladaLoader(),
      'TextureLoader': new this.THREE.TextureLoader()
    }
  }


  async start (instancesMap) {
    this.instancesMap = instancesMap;
    await this.traverseInstances(this.instancesMap);
  }


  getMeshes () {
    const meshes = { ...this.splitMeshes };
    for (const m in this.meshes) {
      if (!(m in meshes)) {
        meshes[m] = this.meshes[m];
      }
    }
    return meshes;
  }


  async traverseInstances (instances) {
    for (const mInstance of instances.entries()) {
      if (mInstance[1].visibility === false) {
        delete this.meshes[mInstance[0]];
        return;
      } else if (this.meshes[mInstance[0]] !== undefined) {
        if (mInstance[1].color !== undefined) {
          this.setColor(mInstance[0], mInstance[1].color);
        }
        continue;
      }
      const gInstance = Instances.getInstance(mInstance[0]);
      await this.buildVisualInstance(gInstance);
      if (mInstance[1].color !== undefined) {
        this.setColor(mInstance[0], mInstance[1].color);
      }
    }
  }


  async buildVisualInstance (instance) {
    const instancePath = instance.getInstancePath();
    // If the same mesh already exists skip the recreation
    if (this.meshes[instancePath]) {
      return;
    } else {
      const meshes = await this.generate3DObjects(instance);
      this.init3DObject(meshes, instance);
    }
  }

  async generate3DObjects (instance) {

    const materials = {
      mesh: this.getMeshPhongMaterial(),
      line: this.getLineMaterial(),
    };

    const instanceObjects = [];
    const threeDeeObjList = await this.walkVisTreeGen3DObjs(instance, materials);
    if (threeDeeObjList.length > 1) {
      const mergedObjs = this.merge3DObjects(threeDeeObjList, materials);
      // investigate need to obj.dispose for obj in threeDeeObjList
      if (mergedObjs != null) {
        mergedObjs.instancePath = instance.getInstancePath();
        instanceObjects.push(mergedObjs);
      } else {
        for (const obj in threeDeeObjList) {
          threeDeeObjList[obj].instancePath = instance.getInstancePath();
          instanceObjects.push(threeDeeObjList[obj]);
        }
      }
    } else if (threeDeeObjList.length === 1) {
      // only one object in list, add it to local array and set
      instanceObjects.push(threeDeeObjList[0]);
      instanceObjects[0].instancePath = instance.getInstancePath();
    }
    return instanceObjects;
  }

  getMeshPhongMaterial (color) {
    if (color === undefined) {
      color = Resources.COLORS.DEFAULT;
    }
    const material = new this.THREE.MeshPhongMaterial({
      opacity: 1,
      shininess: 10,
      flatShading: false,
      depthWrite: this.depthWrite,
    });

    this.setThreeColor(material.color, color);
    material.defaultColor = color;
    material.defaultOpacity = Resources.OPACITY.DEFAULT;
    material.nowireframe = true;
    return material;
  }

  getLineMaterial (color) {
    if (color === undefined) {
      color = Resources.COLORS.DEFAULT;
    }
    const material = new this.THREE.LineBasicMaterial({
      depthWrite: this.depthWrite,
    });
    this.setThreeColor(material.color, color);
    material.defaultColor = color;
    material.defaultOpacity = Resources.OPACITY.DEFAULT;
    return material;
  }

  setThreeColor (threeColor, color) {
    // eslint-disable-next-line no-restricted-globals
    if (!isNaN(color % 1)) {
      // we have an integer (hex) value
      threeColor.setHex(color);
    } else if (
      Object.prototype.hasOwnProperty.call(color, 'r')
        && Object.prototype.hasOwnProperty.call(color, 'g')
        && Object.prototype.hasOwnProperty.call(color, 'b')
    ) {
      threeColor.r = color.r;
      threeColor.g = color.g;
      threeColor.b = color.b;
    } else {
      threeColor.set(color);
    }
  }

  async walkVisTreeGen3DObjs (instance, materials) {
    if (hasVisualValue(instance)) {
      const visualValue = instance.getVisualValue();
      const threeDObj = await this.create3DObjectFromInstance(
        instance,
        visualValue,
        instance.getId(),
        materials
      );
      if (threeDObj) {
        return [threeDObj]
      }
    }
    let visualType
    try {
      visualType = instance.getVisualType();
    } catch (e) {
      visualType = undefined
    }
    if (visualType === undefined) {
      return [];
    } else if (visualType.isArray) {
      const threeDObjList = []
      await Promise.all(visualType.forEach(
        async vt => threeDObjList.push((await this.walkVisTreeGen3DObjsVisualType(vt, instance, materials)))
      ))
      return threeDObjList
    } else {
      return await this.walkVisTreeGen3DObjsVisualType(visualType, instance, materials)
    }
  }

  async walkVisTreeGen3DObjsVisualType (visualType, instance, materials) {
    const threeDeeObjList = [];
    let threeDeeObj = null;
    if (
      visualType.getMetaType() === Resources.COMPOSITE_VISUAL_TYPE_NODE
    ) {
      for (const v in visualType.getVariables()) {
        const visualValue = visualType.getVariables()[v].getWrappedObj().initialValues[0].value;
        threeDeeObj = await this.create3DObjectFromInstance(
          instance,
          visualValue,
          visualType.getVariables()[v].getId(),
          materials
        );
        if (threeDeeObj) {
          threeDeeObjList.push(threeDeeObj);
        }
      }
    } else if (
      visualType.getMetaType() === Resources.VISUAL_TYPE_NODE
        && visualType.getId() === 'particles'
    ) {
      const visualValue = instance.getVariable().getWrappedObj().initialValues[0].value;
      threeDeeObj = await this.create3DObjectFromInstance(
        instance,
        visualValue,
        instance.getVariable().getId(),
        materials
      );
      if (threeDeeObj) {
        threeDeeObjList.push(threeDeeObj);
      }
    } else {
      const visualValue = visualType.getWrappedObj().defaultValue;
      threeDeeObj = await this.create3DObjectFromInstance(
        instance,
        visualValue,
        visualType.getId(),
        materials
      );
      if (threeDeeObj) {
        threeDeeObjList.push(threeDeeObj);
      }
    }
    return threeDeeObjList
  }


  async create3DObjectFromInstance (instance, node, id, materials) {
    let threeObject = null;

    const lines = this.getDefaultGeometryType() === 'lines';

    const material = lines ? materials.line : materials.mesh;

    // eslint-disable-next-line default-case
    switch (node.eClass) {
    case Resources.PARTICLES:
      threeObject = this.createParticles(node);
      break;

    case Resources.CYLINDER:
      if (lines) {
        threeObject = this.create3DLineFromNode(node, material);
      } else {
        threeObject = this.create3DCylinderFromNode(node, material);
      }
      this.complexity++;
      break;

    case Resources.SPHERE:
      if (lines) {
        threeObject = this.create3DLineFromNode(node, material);
      } else {
        threeObject = this.create3DSphereFromNode(node, material);
      }
      this.complexity++;
      break;
    case Resources.COLLADA:
      threeObject = this.loadColladaModelFromNode(node);
      this.complexity++;
      break;
    case Resources.OBJ:
      threeObject = this.loadThreeOBJModelFromNode(node);
      this.complexity++;
      break;
    case Resources.GLTF:
      threeObject = await this.loadThreeGLTFModelFromNode(node);
      this.complexity++;
      break;
    case Resources.DRC:
      threeObject = await this.loadThreeDRCModelFromNode(node);
      this.complexity++;
      break;
    default:
      console.error(`Invalid node.eClass on node ${node}`)
    }

    if (threeObject) {
      threeObject.visible = true;
      /*
       * FIXME: this is empty for collada and obj nodes
       */
      const instancePath = `${instance.getInstancePath()}.${id}`
      threeObject.instancePath = instancePath;
      threeObject.highlighted = false;

      // FIXME: shouldn't that be the vistree? why is it also done at the loadEntity level??
      this.visualModelMap[instancePath] = threeObject;
    }
    return threeObject;
  }

  getDefaultGeometryType () {
    const aboveLinesThreshold = this.complexity > this.linesThreshold;
    return aboveLinesThreshold ? 'lines' : 'cylinders';
  }

  createParticles (node) {
    const geometry = new this.THREE.Geometry();
    const threeColor = new this.THREE.Color();
    const color = `0x${Math.floor(Math.random() * 16777215).toString(16)}`;
    threeColor.setHex(color);

    const textureLoader = this.loaders['TextureLoader'];
    const particleTexture = this.particleTexture
      ? this.particleTexture
      : textureLoader.load(particle);
    const material = new this.THREE.PointsMaterial({
      size: 0.5,
      map: particleTexture,
      blending: this.THREE.NormalBlending,
      depthTest: true,
      transparent: true,
      color: threeColor,
      depthWrite: this.depthWrite,
    });

    for (let p = 0; p < node.particles.length; p++) {
      geometry.vertices.push(
        new this.THREE.Vector3(
          node.particles[p].x,
          node.particles[p].y,
          node.particles[p].z
        )
      );
    }

    material.defaultColor = color;
    material.defaultOpacity = 1;
    const threeObject = new this.THREE.Points(geometry, material);
    threeObject.visible = true;
    threeObject.instancePath = node.instancePath;
    threeObject.highlighted = false;
    return threeObject;
  }

  create3DLineFromNode (node, material) {
    let threeObject = null;
    if (node.eClass === Resources.CYLINDER) {
      const bottomBasePos = new this.THREE.Vector3(
        node.position.x,
        node.position.y,
        node.position.z
      );
      const topBasePos = new this.THREE.Vector3(
        node.distal.x,
        node.distal.y,
        node.distal.z
      );

      const axis = new this.THREE.Vector3();
      axis.subVectors(topBasePos, bottomBasePos);
      const midPoint = new this.THREE.Vector3();
      midPoint.addVectors(bottomBasePos, topBasePos).multiplyScalar(0.5);

      const geometry = new this.THREE.Geometry();
      geometry.vertices.push(bottomBasePos);
      geometry.vertices.push(topBasePos);
      threeObject = new this.THREE.Line(geometry, material);
      threeObject.applyMatrix(
        new this.THREE.Matrix4().makeTranslation(0, axis.length() / 2, 0)
      );
      threeObject.applyMatrix(
        new this.THREE.Matrix4().makeRotationY(Math.PI / 2)
      );
      threeObject.lookAt(axis);
      threeObject.position.fromArray(bottomBasePos.toArray());
      threeObject.applyMatrix(
        new this.THREE.Matrix4().makeRotationY(-Math.PI / 2)
      );

      threeObject.geometry.verticesNeedUpdate = true;
    } else if (node.eClass === Resources.SPHERE) {
      const sphere = new this.THREE.SphereGeometry(node.radius, 20, 20);
      threeObject = new this.THREE.Mesh(sphere, material);
      threeObject.position.set(
        node.position.x,
        node.position.y,
        node.position.z
      );
      threeObject.geometry.verticesNeedUpdate = true;
    }
    return threeObject;
  }

  create3DSphereFromNode (sphereNode, material) {
    const sphere = new this.THREE.SphereGeometry(sphereNode.radius, 20, 20);
    // sphere.applyMatrix(new this.THREE.Matrix4().makeScale(-1,1,1));
    const threeObject = new this.THREE.Mesh(sphere, material);
    threeObject.position.set(
      sphereNode.position.x,
      sphereNode.position.y,
      sphereNode.position.z
    );

    return threeObject;
  }

  create3DCylinderFromNode (cylNode, material) {
    const bottomBasePos = new this.THREE.Vector3(
      cylNode.position.x,
      cylNode.position.y,
      cylNode.position.z
    );
    const topBasePos = new this.THREE.Vector3(
      cylNode.distal.x,
      cylNode.distal.y,
      cylNode.distal.z
    );

    const axis = new this.THREE.Vector3();
    axis.subVectors(topBasePos, bottomBasePos);

    const c = new this.THREE.CylinderGeometry(
      cylNode.topRadius,
      cylNode.bottomRadius,
      axis.length(),
      20,
      1,
      false
    );

    // shift it so one end rests on the origin
    c.applyMatrix(
      new this.THREE.Matrix4().makeTranslation(0, axis.length() / 2, 0)
    );
    // rotate it the right way for lookAt to work
    c.applyMatrix(new this.THREE.Matrix4().makeRotationX(Math.PI / 2));
    // make a mesh with the geometry
    const threeObject = new this.THREE.Mesh(c, material);
    // make it point to where we want
    threeObject.lookAt(axis);
    // move base
    threeObject.position.fromArray(bottomBasePos.toArray());
    threeObject.geometry.verticesNeedUpdate = true;

    return threeObject;
  }

  // TODO: Collada example
  loadColladaModelFromNode (node) {
    const loader = this.loaders[Resources.COLLADA]
    loader.options.convertUpAxis = true;
    let scene = null;
    const that = this;
    loader.parse(node.collada, function (collada) {
      // eslint-disable-next-line prefer-destructuring
      scene = collada.scene;
      scene.traverse(function (child) {
        if (child instanceof that.THREE.Mesh) {
          child.material.defaultColor = Resources.COLORS.DEFAULT;
          child.material.defaultOpacity = Resources.OPACITY.DEFAULT;
          child.material.wireframe = that.wireframe;
          child.material.opacity = Resources.OPACITY.DEFAULT;
          child.geometry.computeVertexNormals();
        }
        if (child instanceof that.THREE.SkinnedMesh) {
          child.material.skinning = true;
          child.material.defaultColor = Resources.COLORS.DEFAULT;
          child.material.defaultOpacity = Resources.OPACITY.DEFAULT;
          child.material.wireframe = that.wireframe;
          child.material.opacity = Resources.OPACITY.DEFAULT;
          child.geometry.computeVertexNormals();
        }
      });
    });
    return scene;
  }

  loadThreeOBJModelFromNode (node) {
    const loader = this.loaders[Resources.OBJ];
    const textureLoader = this.loaders['TextureLoader']
    const particleTexture = this.particleTexture
      ? this.particleTexture
      : textureLoader.load(particle);

    const scene = loader.parse(this.parseBase64(node.obj), particleTexture);
    const that = this;
    scene.traverse(function (child) {
      if (child instanceof that.THREE.Mesh) {
        that.setThreeColor(
          child.material.color,
          Resources.COLORS.DEFAULT
        );
        child.material.wireframe = that.wireframe;
        child.material.defaultColor = Resources.COLORS.DEFAULT;
        child.material.defaultOpacity = Resources.OPACITY.DEFAULT;
        child.material.opacity = Resources.OPACITY.DEFAULT;
        child.geometry.computeVertexNormals();
      }
    });

    return scene;
  }

  async loadThreeGLTFModelFromNode (node) {
    const loader = this.loaders[Resources.GLTF]
    const gltfData = await this.modelParser(loader, this.parseBase64(node.gltf));
    if (gltfData.scene.children.length === 1) {
      const that = this;
      gltfData.scene.children[0].traverse(function (child) {
        if (child instanceof that.THREE.Mesh) {
          that.setThreeColor(
            child.material.color,
            Resources.COLORS.DEFAULT
          );
          child.material.wireframe = that.wireframe;
          child.material.defaultColor = Resources.COLORS.DEFAULT;
          child.material.defaultOpacity = Resources.OPACITY.DEFAULT;
          child.material.opacity = Resources.OPACITY.DEFAULT;
          child.geometry.computeVertexNormals();
        }
      });
    } else {
      console.error("GEPPETTO Error - GLTF loaded more than one object in the scene.");
    }
    return gltfData.scene.children[0];
  }

  async loadThreeDRCModelFromNode (node) {
    const dracoLoader = this.loaders[Resources.DRC];
    const geometry = await this.modelLoader(dracoLoader, node.drc);
    geometry.computeVertexNormals();
    return new this.THREE.Mesh(geometry, this.getMeshPhongMaterial())
  }

  parseBase64 (str) {
    try {
      return atob(str.split('base64,')[1]);
    } catch (e) {
      return str
    }
  }

  modelLoader (loader, url) {
    return new Promise((resolve, reject) => {
      loader.load(url, data => resolve(data), null, reject);
    });
  }

  async modelParser (loader, data) {
    let results = await new Promise((resolve, reject) => {
      loader.parse(data, null, data => {
        return resolve(data);
      }, reject);
    });
    return results;
  }

  init3DObject (meshes, instance) {
    const instancePath = instance.getInstancePath();
    const position = instance.getPosition();
    for (const m in meshes) {
      const mesh = meshes[m];

      mesh.instancePath = instancePath;
      /*
      * if the model file is specifying a position for the loaded meshes then we translate them here
      */
      if (position != null) {
        mesh.position.set(position.x, position.y, position.z);
      }

      this.meshes[instancePath] = mesh;
      this.meshes[instancePath].visible = true;
      this.meshes[instancePath].defaultOpacity = 1;
      this.meshes[instancePath].input = false;
      this.meshes[instancePath].output = false;

      // Split anything that was splitted before
      if (instancePath in this.splitMeshes) {
        const { splitMeshes } = this;
        const elements = {};
        for (const splitMesh in splitMeshes) {
          if (
            splitMeshes[splitMesh].instancePath === instancePath
              && splitMesh !== instancePath
          ) {
            const visualObject = splitMesh.substring(instancePath.length + 1);
            elements[visualObject] = '';
          }
        }
        if (Object.keys(elements).length > 0) {
          this.splitGroups(instance, elements);
        }
      }
      this.calculateSceneMaxRadius(mesh);
    }
  }

  merge3DObjects (objArray, materials) {
    const mergedMeshesPaths = [];
    let ret = null;
    let mergedLines;
    let mergedMeshes;
    const that = this;
    objArray.forEach(function (obj) {
      if (obj instanceof that.THREE.Line) {
        if (mergedLines === undefined) {
          mergedLines = new that.THREE.Geometry();
        }
        mergedLines.vertices.push(obj.geometry.vertices[0]);
        mergedLines.vertices.push(obj.geometry.vertices[1]);
      } else if (obj.geometry.type === 'Geometry') {
        // This catches both Collada an OBJ
        if (objArray.length > 1) {
          throw Error('Merging of multiple OBJs or Colladas not supported');
        } else {
          ret = obj;
        }
      } else {
        if (mergedMeshes === undefined) {
          mergedMeshes = new that.THREE.Geometry();
        }
        obj.geometry.dynamic = true;
        obj.geometry.verticesNeedUpdate = true;
        obj.updateMatrix();
        mergedMeshes.merge(obj.geometry, obj.matrix);
      }
      mergedMeshesPaths.push(obj.instancePath);
    });

    if (mergedLines === undefined) {
      /*
       * There are no line geometries, we just create a mesh for the merge of the solid geometries
       * and apply the mesh material
       */
      ret = new that.THREE.Mesh(mergedMeshes, materials.mesh);
    } else {
      ret = new that.THREE.LineSegments(mergedLines, materials.line);
      if (mergedMeshes !== undefined) {
        // we merge into a single mesh both types of geometries (from lines and 3D objects)
        const tempmesh = new that.THREE.Mesh(mergedMeshes, materials.mesh);
        ret.geometry.merge(tempmesh.geometry, tempmesh.matrix);
      }
    }

    if (ret != null && !Array.isArray(ret)) {
      ret.mergedMeshesPaths = mergedMeshesPaths;
    }

    return ret;
  }

  /**
   * Split merged mesh into individual meshes
   *
   *            instance - original instance
   *            groups - The groups that we need to split mesh into
   * @param instance
   * @param groupElements
   */
  splitGroups (instance, groupElements) {
    if (!this.hasMesh(instance)) {
      return;
    }
    const instancePath = instance.getInstancePath();

    // retrieve the merged mesh
    const mergedMesh = this.meshes[instancePath];
    // create object to hold geometries used for merging objects in groups
    const geometryGroups = {};

    /*
     * reset the aspect instance path group mesh, this is used to group visual objects that don't belong to any of the groups passed as parameter
     */
    this.splitMeshes[instancePath] = null;
    geometryGroups[instancePath] = new this.THREE.Geometry();

    // create map of geometry groups for groups
    for (const groupElement in groupElements) {
      const groupName = `${instancePath}.${groupElement}`;

      const geometry = new this.THREE.Geometry();
      geometry.groupMerge = true;

      geometryGroups[groupName] = geometry;
    }

    // get map of all meshes that merged mesh was merging
    const map = mergedMesh.mergedMeshesPaths;

    /*
     * flag for keep track what visual objects were added to group
     * meshes already
     */
    let added = false;
    /*
     * loop through individual meshes, add them to group, set new
     * material to them
     */

    for (const v in map) {
      if (v !== undefined) {
        const m = this.visualModelMap[map[v]];

        // eslint-disable-next-line no-eval
        Instances.getInstance(map[v].substring(0, map[v].lastIndexOf('.')));
        const object = instance.getVisualType()[
          map[v].replace(`${instancePath}.`, '')
        ];

        // If it is a segment compare to the id otherwise check in the visual groups
        if (object.getId() in groupElements) {
          // true means don't add to mesh with non-groups visual objects
          added = this.addMeshToGeometryGroup(
            instance,
            object.getId(),
            geometryGroups,
            m
          );
        } else {
          // get group elements list for object
          const groupElementsReference = object.getInitialValue().value.groupElements;
          for (let i = 0; i < groupElementsReference.length; i++) {
            const objectGroup = ModelFactory.resolve(
              groupElementsReference[i].$ref
            ).getId();
            if (objectGroup in groupElements) {
              // true means don't add to mesh with non-groups visual objects
              added = this.addMeshToGeometryGroup(
                instance,
                objectGroup,
                geometryGroups,
                m
              );
            }
          }
        }

        /*
         * if visual object didn't belong to group, add it to mesh
         * with remainder of them
         */
        if (!added) {
          const geometry = geometryGroups[instancePath];
          if (m instanceof this.THREE.Line) {
            geometry.vertices.push(m.geometry.vertices[0]);
            geometry.vertices.push(m.geometry.vertices[1]);
          } else {
            // merged mesh into corresponding geometry
            geometry.merge(m.geometry, m.matrix);
          }
        }
        // reset flag for next visual object
        added = false;
      }
    }

    groupElements[instancePath] = {};
    groupElements[instancePath].color = Resources.COLORS.SPLIT;
    this.createGroupMeshes(instancePath, geometryGroups, groupElements);
  }

  /**
   * Add mesh to geometry groups
   *
   *            instancePath - Path of aspect, corresponds to original merged mesh
   *            id - local path to the group
   *            groups - The groups that we need to split mesh into
   *            m - current mesh
   * @param instance
   * @param id
   * @param geometryGroups
   * @param m
   */
  addMeshToGeometryGroup (instance, id, geometryGroups, m) {
    if (!this.hasMesh(instance)) {
      return;
    }
    // name of group, mix of aspect path and group name
    const groupName = `${instance.getInstancePath()}.${id}`;
    // retrieve corresponding geometry for this group
    const geometry = geometryGroups[groupName];
    // only merge if flag is set to true
    if (m instanceof this.THREE.Line) {
      geometry.vertices.push(m.geometry.vertices[0]);
      geometry.vertices.push(m.geometry.vertices[1]);
    } else {
      // merged mesh into corresponding geometry
      geometry.merge(m.geometry, m.matrix);
    }
    // eslint-disable-next-line consistent-return
    return true;
  }

  /**
   * Create group meshes for given groups, retrieves from map if already present
   * @param instancePath
   * @param geometryGroups
   * @param groups
   */
  createGroupMeshes (instancePath, geometryGroups, groups) {
    if (!this.hasMesh(instancePath)) {
      return;
    }
    const mergedMesh = this.meshes[instancePath];
    // switch visible flag to false for merged mesh and remove from scene
    mergedMesh.visible = false;

    for (const g in groups) {
      let groupName = g;
      if (groupName.indexOf(instancePath) <= -1) {
        groupName = `${instancePath}.${g}`;
      }

      let groupMesh = this.splitMeshes[groupName];
      const geometryGroup = geometryGroups[groupName];

      if (mergedMesh instanceof this.THREE.Line) {
        const material = this.getLineMaterial();
        groupMesh = new this.THREE.LineSegments(geometryGroup, material);
      } else {
        const material = this.getMeshPhongMaterial();
        groupMesh = new this.THREE.Mesh(geometryGroup, material);
      }
      groupMesh.instancePath = instancePath;
      groupMesh.geometryIdentifier = g;
      groupMesh.geometry.dynamic = false;
      groupMesh.position.copy(mergedMesh.position);

      this.splitMeshes[groupName] = groupMesh;

      // add split mesh to scenne and set flag to visible
      groupMesh.visible = true;
    }
  }

  /**
   * Changes the color of a given instance
   *
   * @param instancePath
   * @param color
   */
  setColor (instancePath, color) {
    if (!this.hasMesh(instancePath)) {
      return;
    }
    const meshes = this.getRealMeshesForInstancePath(instancePath);
    if (meshes.length > 0) {
      for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i];
        if (mesh) {
          const that = this;
          mesh.traverse(function (object) {
            if (Object.prototype.hasOwnProperty.call(object, 'material')) {
              that.setThreeColor(object.material.color, color);
              object.material.defaultColor = color;
              if (color.a) {
                object.material.transparent = true;
                object.material.opacity = color.a;
              }
            }
          });
        }
      }
    }
  }

  /**
   * Get Meshes associated to an instance
   *
   *            instancePath - Path of the instance
   * @param instancePath
   */
  getRealMeshesForInstancePath (instancePath) {
    const meshes = [];
    if (instancePath in this.splitMeshes) {
      for (const keySplitMeshes in this.splitMeshes) {
        if (keySplitMeshes.startsWith(instancePath)) {
          meshes.push(this.splitMeshes[keySplitMeshes]);
        }
      }
    } else if (instancePath in this.meshes) {
      meshes.push(this.meshes[instancePath]);
    }
    return meshes;
  }

  /**
   * Checks if instance has a mesh
   *
   * @param instance
   */
  hasMesh (instance) {
    const instancePath = typeof instance == 'string' ? instance : instance.getInstancePath();
    return this.meshes[instancePath] !== undefined;
  }

  /**
   * Traverse through THREE object to calculate that maximun radius based
   * on bounding sphere of visible objects
   * @param object
   */
  calculateSceneMaxRadius (object) {
    let currentRadius = 0;
    if (object.children.length > 0) {
      for (let i = 0; i < object.children.length; i++) {
        if (object.children[i] !== undefined) {
          this.calculateSceneMaxRadius(object.children[i]);
        }
      }
    } else {
      if (Object.prototype.hasOwnProperty.call(object, 'geometry')) {
        object.geometry.computeBoundingSphere();
        currentRadius = object.geometry.boundingSphere.radius;
      }
    }

    if (currentRadius > this.sceneMaxRadius) {
      this.sceneMaxRadius = currentRadius;
    }
  }

  /**
   * Calculates linePrecision used by raycaster when picking objects.
   */
  getLinePrecision () {
    this.rayCasterLinePrecision = this.sceneMaxRadius / this.linePrecisionMinRadius;
    if (this.rayCasterLinePrecision < this.minAllowedLinePrecision) {
      this.rayCasterLinePrecision = this.minAllowedLinePrecision;
    }
    this.rayCasterLinePrecision = Math.round(this.rayCasterLinePrecision);

    return this.rayCasterLinePrecision;
  }

  cleanWith3DObject(instance) {
    for (let meshKey of Object.keys(this.meshes)) {
      if (this.meshes[meshKey].uuid === instance.uuid) {
        delete this.meshes[meshKey];
      }
    }
  }

  clean () {
    this.meshes = {};
    this.splitMeshes = {};
    this.visualModelMap = {};
    this.complexity = 0;
    this.sceneMaxRadius = 0;
  }

  setParticleTexture (particleTexture) {
    this.particleTexture = particleTexture;
  }

  /**
   * Sets linesThreshold
   */
  setLinesThreshold (linesThreshold) {
    this.linesThreshold = linesThreshold
  }
}
