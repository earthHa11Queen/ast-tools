package com.ast_tool.junit.common.container;

import java.lang.reflect.Array;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;

/** Converts common convModel + Java referenceType into Java container implementations. */
public final class ContainerFactory {

    private final JavaReferenceTypeResolver types = new JavaReferenceTypeResolver();

    public Object createCollection(String convModel, String referenceType, List<Object> values) {
        String conv = convModel == null ? "" : convModel.trim().toUpperCase();
        String raw = types.rawType(referenceType);

        if ("ARRAY".equals(conv)) {
            LinkedHashSet<Object> set = new LinkedHashSet<>(values);
            if (set.size() != values.size()) {
                throw new IllegalStateException(
                        "ARRAY/Set requires unique generated elements: referenceType=" + referenceType
                );
            }
            return set;
        }

        if (!"COLLECTION".equals(conv)) {
            throw new IllegalStateException("Not a Collection/Array convModel: " + convModel);
        }

        if (types.isJavaArray(referenceType)) {
            Class<?> component = types.arrayComponentClass(referenceType);
            Object array = Array.newInstance(component, values.size());
            for (int i = 0; i < values.size(); i++) {
                Array.set(array, i, values.get(i));
            }
            return array;
        }

        return switch (simpleName(raw)) {
            case "Set", "HashSet", "LinkedHashSet" -> new LinkedHashSet<>(values);
            case "Queue", "Deque", "ArrayDeque" -> new ArrayDeque<>(values);
            case "List", "ArrayList", "Collection", "Iterable" -> new ArrayList<>(values);
            default -> new ArrayList<>(values);
        };
    }

    public Map<Object, Object> createMap(List<Object> keys, List<Object> values) {
        if (keys.size() != values.size()) {
            throw new IllegalStateException("Map key/value counts differ");
        }
        LinkedHashMap<Object, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < keys.size(); i++) {
            Object previous = result.put(keys.get(i), values.get(i));
            if (previous != null || result.size() != i + 1) {
                throw new IllegalStateException("Map key collision at elementIndex=" + i);
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    public <T> T cast(Object value, Class<T> requestedType) {
        if (value == null) {
            return null;
        }
        if (requestedType.isPrimitive()) {
            return (T) value;
        }
        if (!requestedType.isInstance(value)) {
            throw new IllegalStateException(
                    "Generated container type " + value.getClass().getName()
                            + " is not assignable to requested type " + requestedType.getName()
            );
        }
        return requestedType.cast(value);
    }

    private static String simpleName(String raw) {
        int dot = raw.lastIndexOf('.');
        return dot >= 0 ? raw.substring(dot + 1) : raw;
    }
}
