import { useEditorStore } from './store/editorStore';
import { DropZone } from './components/DropZone';
import { Editor } from './components/Editor';

function App() {
  const sourceImage = useEditorStore((s) => s.sourceImage);

  return sourceImage ? <Editor /> : <DropZone />;
}

export default App;
