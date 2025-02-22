import React, { Component } from 'react';
import Graph from '@metacell/geppetto-meta-ui/graph-visualization/Graph';

class GraphVisualizationShowcase extends Component {

  getData () {
    return {
      nodes: [
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ],
      links: [
        { source: 1, target: 2 },
        { source: 2, target: 3 },
        { source: 3, target: 1 }
      ]
    }
  }

  render () {
    return (
      <div style={{ width: 600, height: 500 }}>
        <Graph
          data={this.getData()}
          nodeLabel={node => node.name}
          linkLabel={link => link.name}
          nodeRelSize={5}
        />
      </div>
    )
  }
}

export const MyComponent = (props) => {

    const { text } = props;

    return (
        <div>
            <h1>Robert Frost</h1>
            <p>{text}</p>
            <div style={{ display: 'flex', justifyContent: 'center'}}>
                <GraphVisualizationShowcase />
            </div>
        </div>
    )
}