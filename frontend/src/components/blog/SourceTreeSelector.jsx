import { useMemo } from "react";
import { FileText, Folder, Check } from "lucide-react";

export default function SourceTreeSelector({ sourceFiles, selectedFiles, onToggle }) {
    const tree = useMemo(() => {
        if (!sourceFiles) return {};
        const root = {};
        sourceFiles.forEach(file => {
            const parts = file.path.split('/');
            let current = root;
            parts.forEach((part, idx) => {
                if (!current[part]) {
                    current[part] = {
                        name: part,
                        path: parts.slice(0, idx + 1).join('/'),
                        children: {},
                        isFile: idx === parts.length - 1,
                        recommended: file.recommended,
                        score: file.score
                    };
                }
                current = current[part].children;
            });
        });
        return root;
    }, [sourceFiles]);

    const renderNode = (nodes, depth = 0) => {
        return Object.values(nodes).map(node => {
            const isSelected = selectedFiles.includes(node.path);
            return (
                <div key={node.path} className="select-none">
                    <div className={`flex items-center gap-2 py-1 px-2 rounded transition-colors ${depth > 0 ? 'ml-3' : ''} ${isSelected ? 'bg-purple-100/70' : 'hover:bg-purple-50'}`}>
                        {node.isFile ? (
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onToggle(node.path)}
                                    className="w-3 h-3 accent-purple-600 rounded cursor-pointer"
                                />
                                <FileText size={12} className={node.recommended ? "text-purple-600" : "text-gray-400"} />
                                <span className={`text-[11px] truncate ${node.recommended ? 'font-bold text-purple-700' : 'text-gray-600'}`}>
                                    {node.name}
                                </span>
                                {node.recommended && (
                                    <span className="text-[8px] bg-purple-600 text-white px-1.5 rounded-full flex items-center gap-0.5 ml-auto flex-shrink-0 shadow-sm">
                                        <Check size={8} strokeWidth={4} /> AI Pick
                                    </span>
                                )}
                            </label>
                        ) : (
                            <div className="flex items-center gap-1 text-gray-400">
                                <Folder size={12} className="fill-gray-100" />
                                <span className="text-[11px] font-bold text-gray-500">{node.name}</span>
                            </div>
                        )}
                    </div>
                    {!node.isFile && <div className="border-l border-gray-100 ml-2">{renderNode(node.children, depth + 1)}</div>}
                </div>
            );
        });
    };

    return (
        <div className="border-2 border-purple-100 rounded-lg max-h-64 overflow-y-auto bg-white p-2 custom-scrollbar shadow-inner mt-2">
            {sourceFiles && sourceFiles.length > 0 ? renderNode(tree) : (
                <div className="text-center py-6 text-gray-400 text-xs italic">
                    AI 분석 결과가 여기에 표시됩니다.
                </div>
            )}
        </div>
    );
};
