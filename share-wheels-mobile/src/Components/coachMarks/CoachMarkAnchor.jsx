import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { useCoachMarks } from "../../context/CoachMarksContext";

/**
 * Wraps a UI target so coach marks can highlight it. No effect when tour is inactive.
 */
const CoachMarkAnchor = ({ id, children, style, pointerEvents }) => {
  const ref = useRef(null);
  const { registerAnchor, unregisterAnchor } = useCoachMarks();

  useEffect(() => {
    if (!id) return undefined;

    const measure = (cb) => {
      const node = ref.current;
      if (!node?.measureInWindow) {
        cb(null);
        return;
      }
      node.measureInWindow((x, y, width, height) => {
        if (width < 1 || height < 1) {
          cb(null);
          return;
        }
        cb({ x, y, width, height });
      });
    };

    registerAnchor(id, measure);
    return () => unregisterAnchor(id);
  }, [id, registerAnchor, unregisterAnchor]);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={style}
      pointerEvents={pointerEvents}
    >
      {children}
    </View>
  );
};

export default CoachMarkAnchor;
