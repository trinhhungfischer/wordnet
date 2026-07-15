import GraphEditor from './components/GraphEditor';
import { ReactFlowProvider } from '@xyflow/react';

function App() {
  return (
    <div className="App">
      <ReactFlowProvider>
        <GraphEditor />
      </ReactFlowProvider>
    </div>
  );
}

export default App;
