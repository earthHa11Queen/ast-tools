CREATE VIEW IF NOT EXISTS v_all_ast_method_level AS
SELECT language, filepath,classname,methodname,process1,process2,process3,process4,process5,process6,process7,process8,process9,processcontent,role,returntype,methodtype,accessmodifier,arg1,arg2,arg3,arg4,arg5,arg6,arg7,arg8,arg9,arg10,arg11,arg12,arg13,arg14,arg15,arg16,arg17,arg18,arg19,arg20
FROM ast_method_level
ORDER BY filepath,classname,methodname,process1,process2,process3,process4,process5,process6,process7,process8,process9
;