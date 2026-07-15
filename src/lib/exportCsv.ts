import type { Node, Edge } from '@xyflow/react';
import Papa from 'papaparse';

export function exportGraphToCsv(nodes: Node[], edges: Edge[]) {
  // We want a format that supports multiple parents per child if necessary.
  // A standard format: Parent, Child
  
  const data: any[] = [];
  
  // Find all connections
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      data.push({
        Parent: sourceNode.data.label,
        Child: targetNode.data.label
      });
    }
  });

  // If there are nodes with no edges, they might be isolated root nodes.
  // It's up to you if you want to include them. Usually in this game, 
  // we only care about merged relationships (edges).
  
  const csv = Papa.unparse(data);
  
  // Create a download link
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "wordnet_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
