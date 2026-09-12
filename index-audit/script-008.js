
        /* Carrega pdfjs como modulo ES e expoe globalmente */ import * as _pdfjs from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"; _pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        window.pdfjsLib = _pdfjs; window["pdfjs-dist/build/pdf"] = _pdfjs;
    
