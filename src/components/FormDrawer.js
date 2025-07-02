"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const drawerVariants = {
  hidden: { y: "100%" },
  visible: { y: 0 },
  exit: { y: "100%" },
};

const FormDrawer = ({ isOpen, onClose, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="form-drawer"
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FormDrawer;
