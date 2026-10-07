package tn.enicarthage.backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ExportServiceTest {

    @Test
    void cell_quotesCommasQuotesAndNewlines() {
        assertEquals("plain", ExportService.Csv.cell("plain"));
        assertEquals("\"a, b\"", ExportService.Csv.cell("a, b"));
        assertEquals("\"say \"\"hi\"\"\"", ExportService.Csv.cell("say \"hi\""));
        assertEquals("\"line1\nline2\"", ExportService.Csv.cell("line1\nline2"));
        assertEquals("", ExportService.Csv.cell(null));
    }

    @Test
    void cell_neutralisesFormulas() {
        // a startup named "=HYPERLINK(...)" must not run as a formula when the admin opens the file
        assertEquals("'=1+1", ExportService.Csv.cell("=1+1"));
        assertEquals("'+33 6", ExportService.Csv.cell("+33 6"));
        assertEquals("'@SUM(A1)", ExportService.Csv.cell("@SUM(A1)"));
        assertEquals("\"'=HYPERLINK(\"\"x\"\",\"\"y\"\")\"", ExportService.Csv.cell("=HYPERLINK(\"x\",\"y\")"));
    }

    @Test
    void cell_keepsNegativeNumbers() {
        assertEquals("-2.5", ExportService.Csv.cell(-2.5));
    }

    @Test
    void csv_startsWithBomAndHeader_rowsEndWithCrlf() {
        ExportService.Csv csv = new ExportService.Csv("Name", "Score");
        csv.row("Sara", 18.5);
        assertEquals("﻿Name,Score\r\nSara,18.5\r\n", csv.toString());
    }
}
