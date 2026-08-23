package com.ast_tool.junit.common;

import com.ast_tool.junit.common.model.TestDataMode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ContainerRuntimeTest {

    @TempDir
    Path temp;

    @Test
    void normalListGeneratesThreeElementsAndEvidenceRows() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                C1,items,target-1,TARGET,COLLECTION,-,-,-,1,255,false,List<String>,,
                C1,items[],target-1,NORMAL,STRING,-,-,-,1,255,false,String,,
                """);
        Path evidence = temp.resolve("evidence.csv");

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .evidenceOutputCsv(evidence)
                .mode(TestDataMode.GENERATE)
                .build()) {
            @SuppressWarnings("unchecked")
            List<String> values = runtime.getValue("C1", "items", List.class);
            assertEquals(List.of("test", "test", "test"), values);
        }

        String csv = Files.readString(evidence, StandardCharsets.UTF_8);
        assertTrue(csv.contains("elementIndex"));
        assertTrue(csv.contains("items,target-1,TARGET,COLLECTION"));
        assertTrue(csv.contains("items[],target-1,NORMAL,STRING"));
        assertTrue(csv.contains(",0,VALUE,test,4,"));
        assertTrue(csv.contains(",1,VALUE,test,4,"));
        assertTrue(csv.contains(",2,VALUE,test,4,"));
    }

    @Test
    void emptyListMeansZeroElements() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                C1,items,target-1,TARGET,COLLECTION,-,2:length_empty,-,1,255,false,List<String>,,
                C1,items[],target-1,NORMAL,STRING,-,-,-,1,255,false,String,,
                """);

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .mode(TestDataMode.GENERATE)
                .build()) {
            List<?> values = runtime.getValue("C1", "items", List.class);
            assertTrue(values.isEmpty());
        }
    }

    @Test
    void javaArrayUsesElementInstruction() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                C1,args,target-1,TARGET,COLLECTION,-,-,-,1,255,false,String[],,
                C1,args[],target-1,NORMAL,STRING,-,-,-,1,255,false,String,,
                """);

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .mode(TestDataMode.GENERATE)
                .build()) {
            String[] values = runtime.getValue("C1", "args", String[].class);
            assertArrayEquals(new String[]{"test", "test", "test"}, values);
        }
    }

    @Test
    void mapCreatesThreeEntriesWithUniqueKeys() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                C1,mapping,target-1,TARGET,MAP,-,-,-,1,255,false,Map<String,Integer>,,
                C1,mapping{key},target-1,NORMAL,STRING,-,-,-,1,255,false,String,,
                C1,mapping{value},target-1,NORMAL,NUMBER,-,-,-,1,18,false,Integer,,
                """);

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .mode(TestDataMode.GENERATE)
                .build()) {
            Map<?, ?> values = runtime.getValue("C1", "mapping", Map.class);
            assertEquals(3, values.size());
            assertEquals(List.of("test", "test_1", "test_2"), values.keySet().stream().toList());
            assertEquals(List.of(1, 1, 1), values.values().stream().toList());
        }
    }

    @Test
    void setCreatesThreeDistinctElementsForStructuralValidity() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                C1,tags,target-1,TARGET,ARRAY,-,-,-,1,255,false,Set<String>,,
                C1,tags[],target-1,NORMAL,STRING,-,-,-,1,255,false,String,,
                """);

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .mode(TestDataMode.GENERATE)
                .build()) {
            Set<?> values = runtime.getValue("C1", "tags", Set.class);
            assertEquals(Set.of("test", "test_1", "test_2"), values);
        }
    }

    @Test
    void replayRestoresContainerAndChildrenWithoutGenerators() throws Exception {
        Path instruction = writeInstruction("""
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,fixedValue,referenceValues
                C1,items,target-1,TARGET,COLLECTION,-,-,-,1,255,false,List<String>,,
                C1,items[],target-1,NORMAL,STRING,-,-,-,1,255,false,String,,
                """);
        Path replay = temp.resolve("replay.csv");
        Files.writeString(replay, """
                CaseNo,dataId,targetId,dataRole,convModel,mirrorX,mirrorY,mirrorZ,validationMin,validationMax,nullable,referenceType,elementIndex,valueState,actualValue,actualLength,runMode
                C1,items,target-1,TARGET,COLLECTION,-,-,-,1,255,false,List<String>,-1,VALUE,,3,GENERATE
                C1,items[],target-1,NORMAL,STRING,-,-,-,1,255,false,String,0,VALUE,A,1,GENERATE
                C1,items[],target-1,NORMAL,STRING,-,-,-,1,255,false,String,1,VALUE,B,1,GENERATE
                C1,items[],target-1,NORMAL,STRING,-,-,-,1,255,false,String,2,VALUE,C,1,GENERATE
                """, StandardCharsets.UTF_8);

        try (TestDataRuntime runtime = TestDataRuntime.builder()
                .instructionCsv(instruction)
                .replayInputCsv(replay)
                .mode(TestDataMode.REPLAY)
                .build()) {
            List<?> values = runtime.getValue("C1", "items", List.class);
            assertEquals(List.of("A", "B", "C"), values);
        }
    }

    private Path writeInstruction(String content) throws Exception {
        Path path = temp.resolve("instruction-" + System.nanoTime() + ".csv");
        Files.writeString(path, content.stripLeading(), StandardCharsets.UTF_8);
        return path;
    }
}
