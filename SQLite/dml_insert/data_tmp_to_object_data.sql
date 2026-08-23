INSERT INTO object_data(objectId,parentObjectId,ownerKind,filePath,className,methodName,ownerName,ownerIndex,position,rawType,baseType,convModel,referenceType)
SELECT CAST(objectId AS integer),CAST(parentObjectId AS integer),ownerKind,filePath,className,methodName,ownerName,CAST(ownerIndex AS integer),position,rawType,baseType,convModel,referenceType
FROM object_data_tmp
;