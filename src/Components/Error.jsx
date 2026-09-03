import React from 'react';
import { FaExclamationCircle } from 'react-icons/fa';

const Alerta = ({ children }) => {
  return (
    <div className="my-2 px-3 py-2 bg-red-600/10 border-l-4 border-red-600 text-red-600 rounded-md shadow-sm flex items-start gap-2 text-sm font-semibold">
      <FaExclamationCircle className="mt-[2px] text-base" />
      <p className="font-messina leading-snug">{children}</p>
    </div>
  );
};

export default Alerta;
