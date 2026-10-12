import { useState } from "react";
import { emptyItem } from "../../utils/gst";
import { addPiece, itemFromProduct } from "../../utils/billItems";
import { isWeightUnit } from "../../utils/weight";
import LooseDialog from "./LooseDialog";

/** Adding products to a bill: pieces go straight in, loose items ask for weight / amount first. */
export default function useBillPicker(setItems) {
  const [loose, setLoose] = useState(null);

  const pick = (p) => {
    if (isWeightUnit(p.unit)) setLoose(itemFromProduct(p));
    else setItems((items) => addPiece(items, p));
  };
  const addCustom = (name = "") => setItems((items) => [...items, { ...emptyItem(), product_name: name }]);

  const dialog = loose && (
    <LooseDialog
      item={loose}
      onClose={() => setLoose(null)}
      onSave={(line) => {
        setItems((items) => [...items, line]);
        setLoose(null);
      }}
    />
  );
  return { pick, addCustom, dialog };
}
