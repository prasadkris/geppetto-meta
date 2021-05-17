import * as THREE from 'three';


export const json = {
  global: {
    tabEnableClose: true,
    tabSetHeaderHeight: 26,
    tabSetTabStripHeight: 26,
  },
  borders: [
    {
      type: 'border',
      location: 'bottom',
      size: 100,
      children: [],
      barSize: 35,
    },
  ],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'row',
        weight: 55,
        selected: 0,
        children: [
          {
            type: 'tabset',
            weight: 36,
            children: [
              {
                type: 'tab',
                name: 'Canvas 1',
                component: 'canvas',
              },
            ],
          },
          {
            type: 'tabset',
            weight: 64,
            children: [
              {
                type: 'tab',
                name: 'Canvas 2',
                component: 'canvas',
              },
            ],
          },
        ],
      },
      {
        type: 'row',
        weight: 55,
        selected: 0,
        children: [
          {
            type: 'tabset',
            weight: 36,
            children: [
              {
                type: 'tab',
                name: 'Canvas 3',
                component: 'canvas',
              },
            ],
          },
          {
            type: 'tabset',
            weight: 64,
            children: [
              {
                type: 'tab',
                name: 'Canvas 4',
                component: 'canvas',
              },
            ],
          },
        ],
      },
    ],
  },
};

export function getThreeJSObjects () {
/*
 *  const geometry = new THREE.BoxGeometry();
 *  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
 *  const cube = new THREE.Mesh(geometry, material);
 */

  // createObject(neuronOBJ, 'neuron')

  return []
}

/*
 * function createObject ( objFile, objName ) {
 *   const loader = new OBJLoader();
 * 
 *   const container = new THREE.Object3D();
 *   loader.load( objFile , function ( object ) {
 *     object.name = objName;
 *     container.add( object );
 *   })
 *   return container;
 * }
 */