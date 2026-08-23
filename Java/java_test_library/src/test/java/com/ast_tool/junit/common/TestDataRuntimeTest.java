package com.ast_tool.junit.common;

import com.ast_tool.junit.common.model.TestDataMode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class TestDataRuntimeTest {

    @TempDir
    Path temp;

    @Test
    void generateYMaxPlusOneAndWriteEvidence() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                UTAPI-1,request.dbPort,target-1,TARGET,NUMBER,-,6:length_max_plus_1,-,1,65535,false,java.lang.Integer,,
                """);

        Path evidence = temp.resolve("evidence.csv");

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .evidenceOutputCsv(evidence)
                .mode(TestDataMode.GENERATE)
                .build()) {

            Integer value = runtime.getValue(
                    "UTAPI-1",
                    "request.dbPort",
                    Integer.class
            );

            assertEquals(65536, value);
        }

        String csv = Files.readString(
                evidence,
                StandardCharsets.UTF_8
        );

        assertTrue(csv.contains("actualValue"));
        assertTrue(csv.contains("elementIndex"));
        assertTrue(csv.contains("65536"));
    }

    @Test
    void distinguishNullAndEmpty() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                UTAPI-1,request.name,target-1,TARGET,STRING,-,1:length_null,-,-1,-1,false,java.lang.String,,
                UTAPI-2,request.name,target-2,TARGET,STRING,-,2:length_empty,-,-1,-1,false,java.lang.String,,
                """);

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .mode(TestDataMode.GENERATE)
                .build()) {

            assertNull(
                    runtime.getValue(
                            "UTAPI-1",
                            "request.name",
                            String.class
                    )
            );

            assertEquals(
                    "",
                    runtime.getValue(
                            "UTAPI-2",
                            "request.name",
                            String.class
                    )
            );
        }
    }

    @Test
    void generateStringBoundary() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                UTAPI-1,request.name,target-1,TARGET,STRING,-,5:length_max,-,1,5,false,java.lang.String,,
                """);

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .mode(TestDataMode.GENERATE)
                .build()) {

            assertEquals(
                    "AAAAA",
                    runtime.getValue(
                            "UTAPI-1",
                            "request.name",
                            String.class
                    )
            );
        }
    }

    @Test
    void replayUsesRecordedActualValueWithoutRegeneration() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                UTAPI-1,request.dbPort,target-1,TARGET,NUMBER,-,6:length_max_plus_1,-,1,65535,false,java.lang.Integer,,
                """);

        Path replay = temp.resolve("replay.csv");

        Files.writeString(
                replay,
                """
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,elementIndex,valueState,actualValue,actualLength,runMode
                UTAPI-1,request.dbPort,target-1,TARGET,NUMBER,-,6:length_max_plus_1,-,1,65535,false,java.lang.Integer,-1,VALUE,777,3,GENERATE
                """,
                StandardCharsets.UTF_8
        );

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .replayInputCsv(replay)
                .mode(TestDataMode.REPLAY)
                .build()) {

            assertEquals(
                    777,
                    runtime.getValue(
                            "UTAPI-1",
                            "request.dbPort",
                            Integer.class
                    )
            );
        }
    }

    @Test
    void replayMissingValueFailsFast() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                UTAPI-1,request.dbPort,target-1,TARGET,NUMBER,-,6:length_max_plus_1,-,1,65535,false,java.lang.Integer,,
                """);

        Path replay = temp.resolve("replay.csv");

        Files.writeString(
                replay,
                """
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,elementIndex,valueState,actualValue,actualLength,runMode
                """,
                StandardCharsets.UTF_8
        );

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .replayInputCsv(replay)
                .mode(TestDataMode.REPLAY)
                .build()) {

            IllegalStateException ex = assertThrows(
                    IllegalStateException.class,
                    () -> runtime.getValue(
                            "UTAPI-1",
                            "request.dbPort",
                            Integer.class
                    )
            );

            assertTrue(
                    ex.getMessage().contains("fallback is forbidden")
            );
        }
    }

    @Test
    void currentV4XIdsAreDeterministic() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                UTAPI-1,request.name,target-1,TARGET,STRING,37:hw_alphanum,-,-,-1,-1,false,java.lang.String,,
                """);

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .mode(TestDataMode.GENERATE)
                .build()) {

            assertEquals(
                    "AbC123",
                    runtime.getValue(
                            "UTAPI-1",
                            "request.name",
                            String.class
                    )
            );
        }
    }

    @Test
    void arbitraryProjectObjectConversionIsRejected() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                UTAPI-1,request.name,target-1,TARGET,STRING,37:hw_alphanum,-,-,-1,-1,false,java.lang.String,,
                """);

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .mode(TestDataMode.GENERATE)
                .build()) {

            assertThrows(
                    IllegalStateException.class,
                    () -> runtime.getValue(
                            "UTAPI-1",
                            "request.name",
                            ProjectDto.class
                    )
            );
        }
    }

    private Path writeInstruction(String content) throws Exception {
        Path path = temp.resolve(
                "instruction-" + System.nanoTime() + ".csv"
        );

        Files.writeString(
                path,
                content.stripLeading(),
                StandardCharsets.UTF_8
        );

        return path;
    }

    private static final class ProjectDto {
    }
}