import React, { useState, useEffect, useRef } from "react";
import "../styles/Spreadsheet.css";


const Spreadsheet = () => {
    const [rows, setRows] = useState(20);
    const [cols, setCols] = useState(10);
    const [data, setData] = useState({});
    const [formulaBar, setFormulaBar] = useState(""); 
    const [selectedCell, setSelectedCell] = useState(null);
    const [formulaDependencies, setFormulaDependencies] = useState({});
    const [dragging, setDragging] = useState(false);
    const [selectedCells, setSelectedCells] = useState(new Set());
    const dragStartCell = useRef(null);
    const [dragData, setDragData] = useState(null);

    useEffect(() => {
        const savedData = JSON.parse(localStorage.getItem("spreadsheetData"));
        if (savedData) setData(savedData);
    }, []);

    useEffect(() => {
        localStorage.setItem("spreadsheetData", JSON.stringify(data));
    }, [data]);

    const handleChange = (row, col, value) => {
        const key = `${row}-${col}`;
        const newData = { ...data, [key]: value };

        if (value.startsWith("=")) {
            updateFormulaDependencies(key, value);
    }

        setData(newData);
    };

    const handleDragStart = (row, col) => {
        const key = `${row}-${col}`;
        setDragData({ key, value: data[key] });
    };

    const handleDrop = (row, col) => {
        if (dragData) {
            const key = `${row}-${col}`;
            let newData = { ...data, [key]: dragData.value };
            setData(newData);
            setDragData(null);
        }
    };

    const updateFormulaDependencies = (cell, formula) => {
        const matches = formula.match(/[A-Z]+\d+/g) || [];
        setFormulaDependencies((prevDeps) => ({
        ...prevDeps,
        [cell]: matches,
    }));
        recalculateFormulas(cell, formula);
    };

    const recalculateFormulas = (changedCell, formula = null) => {
        let newData = { ...data };
        Object.keys(formulaDependencies).forEach((cell) => {
        if (formulaDependencies[cell].includes(changedCell)) {
            newData[cell] = evaluateFormula(data[cell]);
        }
    });
        setData(newData);
    };

    const evaluateFormula = (formula, row, col) => {
        try {
            let expression = formula.slice(1);
            expression = expression.replace(/\$?([A-Z]+)\$?(\d+)/g, (_, colRef, rowRef) => {
                const colIndex = colRef.charCodeAt(0) - 65;
                const rowIndex = parseInt(rowRef) - 1;
                if (formula.includes("$")) {
                    return data[`${rowIndex}-${colIndex}`] || 0;
                }
                return data[`${rowIndex + (row - rowIndex)}-${colIndex + (col - colIndex)}`] || 0;
            });
            return eval(expression);
        } catch {
            return "ERROR";
        }
    };


    //   data quality functions
    const trimCell = () => {
        const newData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, value.trim()]) );
        setData(newData);
    };

    const convertToUpper = () => {
        const newData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, value.toUpperCase()]));
        setData(newData);
    };

    const convertToLower = () => {
        const newData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value.toLowerCase()]));
        setData(newData);
    };

    const removeDuplicates = () => {
        const uniqueValues = {};
        Object.entries(data).forEach(([key, value]) => {
        if (!Object.values(uniqueValues).includes(value)) {uniqueValues[key] = value;}});
        setData(uniqueValues);
    };

    const findAndReplace = (findText, replaceText) => {
        const newData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key,value.replace(new RegExp(findText, "g"), replaceText),]));
            setData(newData);
    };

    //   math functions
    const calculateMathFunction = (func) => {
        const values = Object.values(data).map(Number).filter(val => !isNaN(val));
        switch (func) {
            case "SUM": return values.reduce((a, b) => a + b, 0);
            case "AVERAGE": return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            case "MAX": return Math.max(...values);
            case "MIN": return Math.min(...values);
            case "COUNT": return values.length;
            default: return null;
        }
    };

    const handleFormulaChange = (e) => {
        setFormulaBar(e.target.value);
        if (selectedCell) {
            handleChange(...selectedCell.split("-"), e.target.value);
        }
    };

    const handleMouseDown = (row, col) => {
        const key = `${row}-${col}`;
        dragStartCell.current = key;
        setDragging(true);
        setSelectedCell(key);
        setFormulaBar(data[key] || "");
        setSelectedCells(new Set([key]));
    };

    const handleMouseEnter = (row, col) => {
        if (dragging) {
        setSelectedCells((prev) => new Set([...prev, `${row}-${col}`]));
        }
    };

    const handleMouseUp = () => {
        if (selectedCells.size > 1) {
            const values = [...selectedCells].map((key) => data[key]);
            const lastValue = values[values.length - 1];
            let newData = { ...data };
            selectedCells.forEach((key) => (newData[key] = lastValue));
            setData(newData);
        }
        setDragging(false);
    };

return (
    <div className="spreadsheet-container">
        <div className="toolbar">
            <button onClick={() => setRows(rows + 1)}>+ Row</button>
            <button onClick={() => setRows(rows > 1 ? rows - 1 : rows)}>- Row</button>
            <button onClick={() => setCols(cols + 1)}>+ Column</button>
            <button onClick={() => setCols(cols > 1 ? cols - 1 : cols)}>- Column</button>
            <button onClick={trimCell}>Trim</button>
            <button onClick={convertToUpper}>Uppercase</button>
            <button onClick={convertToLower}>Lowercase</button>
            <button onClick={removeDuplicates}>Remove Duplicates</button>
        </div>

        {/* find replace bar */}
        <div className="formula-bar">
            <input type="text" placeholder="Find..." id="findText" />
            <input type="text" placeholder="Replace..." id="replaceText" />
            <button onClick={() => findAndReplace(
                document.getElementById("findText").value,
                document.getElementById("replaceText").value
            )}>Find & Replace</button>
        </div>
        
        {/* formula */}
        <div className="formula-bar">
            <input type="text" placeholder="Enter formula (e.g. =SUM(A1:A3))" value={formulaBar}
            onChange={handleFormulaChange}/>
        </div>
        
        {/* math  */}
        <div className="math-functions">
            <button onClick={() => alert("SUM: " + calculateMathFunction("SUM"))}>SUM</button>
            <button onClick={() => alert("AVERAGE: " + calculateMathFunction("AVERAGE"))}>AVERAGE</button>
            <button onClick={() => alert("MAX: " + calculateMathFunction("MAX"))}>MAX</button>
            <button onClick={() => alert("MIN: " + calculateMathFunction("MIN"))}>MIN</button>
            <button onClick={() => alert("COUNT: " + calculateMathFunction("COUNT"))}>COUNT</button>
        </div>
        

        <div className="spreadsheet-grid">
            <table onMouseUp={handleMouseUp}>
                <thead>
                    <tr>
                        {[...Array(cols)].map((_, col) => (
                        <th key={col}>{String.fromCharCode(65 + col)}</th>))}
                    </tr>
                </thead>
                <tbody>
                    {[...Array(rows)].map((_, row) => (
                    <tr key={row}>
                        {[...Array(cols)].map((_, col) => {
                        const key = `${row}-${col}`;
                        return (
                        <td key={col} className={`cell ${selectedCells.has(key) ? "selected" : ""}`}
                        onMouseDown={() => handleMouseDown(row, col)}
                            onMouseEnter={() => handleMouseEnter(row, col)}
                            onDragStart={() => handleDragStart(row, col)}
                            onDrop={() => handleDrop(row, col)}
                            draggable>
                                <input type="text" value={data[key] || ""}
                                onChange={(e) => handleChange(row, col, e.target.value)}/>
                            </td>
                        );
                        })}
                    </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);
};

export default Spreadsheet;
