import React, { useState, useEffect } from "react";
import { AdminApi } from "../services/api";
import { BookOpen, Plus, Search, Check, Save } from "lucide-react";

export const GlossaryView: React.FC = () => {
  const [glossary, setGlossary] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [newCn, setNewCn] = useState("");
  const [newVi, setNewVi] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    AdminApi.getGlossary()
      .then(res => setGlossary(res.glossary || {}))
      .catch(console.error);
  }, []);

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCn.trim() || !newVi.trim()) return;

    try {
      await AdminApi.setGlossaryTerm(newCn.trim(), newVi.trim());
      setGlossary(prev => ({ ...prev, [newCn.trim()]: newVi.trim() }));
      setNewCn("");
      setNewVi("");
      setIsAdding(false);
      setSaveMessage("Đã lưu thuật ngữ thành công!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEntries = Object.entries(glossary).filter(([cn, vi]) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return cn.toLowerCase().includes(q) || vi.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-500" />
            Từ Điển Thuật Ngữ E-Commerce (AI Translation Glossary)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quy định cách AI dịch các thuộc tính tiếng Trung (màu sắc, chất liệu vải, kiểu dáng) sang tiếng Việt quen thuộc với người mua sắm.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Thêm Thuật Ngữ Mới
        </button>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          {saveMessage}
        </div>
      )}

      {/* Modal Thêm Thuật Ngữ */}
      {isAdding && (
        <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-4 animate-in fade-in">
          <h3 className="text-xs font-bold text-slate-900 mb-3">Thêm Cặp Thuật Ngữ Mới</h3>
          <form onSubmit={handleAddTerm} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Từ Tiếng Trung (Gốc 1688)
              </label>
              <input
                type="text"
                value={newCn}
                onChange={(e) => setNewCn(e.target.value)}
                placeholder="Ví dụ: 珍珠白"
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nghĩa Tiếng Việt Chuẩn Bán Hàng
              </label>
              <input
                type="text"
                value={newVi}
                onChange={(e) => setNewVi(e.target.value)}
                placeholder="Ví dụ: Trắng Ngọc Trai"
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                required
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="px-4 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700"
              >
                Lưu Vào Từ Điển
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tiếng Trung hoặc tiếng Việt..."
              className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Tổng cộng: <strong>{filteredEntries.length}</strong> từ khóa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="p-3.5 w-1/3">Thuật Ngữ Gốc 1688 (Tiếng Trung)</th>
                <th className="p-3.5 w-1/2">Quy Chuẩn Dịch Tiếng Việt (E-Commerce)</th>
                <th className="p-3.5 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map(([cn, vi]) => (
                <tr key={cn} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold font-mono text-slate-800 text-sm">{cn}</td>
                  <td className="p-3.5 font-semibold text-slate-700">{vi}</td>
                  <td className="p-3.5 text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      Đang kích hoạt
                    </span>
                  </td>
                </tr>
              ))}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400">
                    Không tìm thấy từ khóa nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
